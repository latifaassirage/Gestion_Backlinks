import { useState, useEffect } from "react";
import api from "../../api/api";
import Navbar from "../../components/Navbar";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import "./Backlinks.css";
import "./SourceSites.css";

export default function Backlinks() {
  const [backlinks, setBacklinks] = useState([]);
  const [clients, setClients] = useState([]);
  const [sources, setSources] = useState([]);
  const [summarySources, setSummarySources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBacklink, setEditingBacklink] = useState(null);
  const [showSourceSitesView, setShowSourceSitesView] = useState(false);
  
  
  const safeBacklinks = Array.isArray(backlinks) ? backlinks : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeSources = Array.isArray(sources) ? sources : [];
  const safeSummarySources = Array.isArray(summarySources) ? summarySources : [];
  
  const [dynamicTypes, setDynamicTypes] = useState([]);
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

 
  const [summaryPagination, setSummaryPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0
  });

 
  const [backlinksPagination, setBacklinksPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0
  });

  const [formData, setFormData] = useState({
    client_id: "",
    source_site_id: "",
    type: "Guest Post",
    link_type: "DoFollow",
    target_url: "",
    anchor_text: "",
    placement_url: "",
    date_added: new Date().toISOString().split('T')[0],
    status: "Pending",
    cost: "",
    quality_score: 3,
    traffic_estimated: 0
  });

  // État pour la recherche
  const [searchTerm, setSearchTerm] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const fetchTypes = async () => {
    try {
      const res = await api.get("/backlink-types");
      setDynamicTypes(res.data);
    } catch (error) {
      console.error("Error fetching types:", error);
    }
  };

  const handleAddNewType = async () => {
    if (!newTypeName.trim()) {
      alert('Veuillez entrer un nom de type');
      return;
    }
    
        const existingTypes = [
      'Guest Post', 'Directory', 'Profile', 'Comment',
      ...dynamicTypes.map(t => t.name.toLowerCase())
    ];
    
    if (existingTypes.includes(newTypeName.toLowerCase().trim())) {
      alert('Ce type existe déjà !');
      return;
    }
    
    try {
      const res = await api.post("/backlink-types", { name: newTypeName.trim() });
      setDynamicTypes([...dynamicTypes, res.data]);
      setFormData({ ...formData, type: res.data.name });
      setNewTypeName("");
      setShowAddType(false);
    } catch (error) {
      alert("Error adding type");
    }
  };

  const handleDeleteType = async (typeId, typeName) => {
    if (window.confirm(`Delete type "${typeName}"?`)) {
      try {
        await api.delete(`/backlink-types/${typeId}`);
        setDynamicTypes(dynamicTypes.filter(t => t.id !== typeId));
        
        
        if (formData.type === typeName) {
          setFormData({ ...formData, type: "" });
        }
        
      alert('Type deleted successfully');
      } catch (error) {
        console.error("Error deleting type:", error);
        
        
        if (error.response?.status === 422) {
        
          alert(error.response.data.message || 'This type cannot be deleted as it is used by existing backlinks.');
        } else if (error.response?.status === 404) {
          alert('Type not found or already deleted');
        } else {
          alert("Error deleting type");
        }
      }
    }
  };

  const fetchBacklinks = async (page = 1, search = '') => {
    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const res = await api.get(`/backlinks?page=${page}&per_page=10${searchParam}`);
      setBacklinks(res.data.data || []);
      setBacklinksPagination({
        current_page: res.data.current_page || 1,
        last_page: res.data.last_page || 1,
        per_page: res.data.per_page || 10,
        total: res.data.total || 0
      });
    } catch (error) {
      console.error("Error fetching backlinks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get("/clients?page=1&per_page=50"); // ✅ Pagination limitée pour dropdown
      console.log("Clients response:", res.data);
      setClients(res.data.data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await api.get("/sources?page=1&per_page=50"); // ✅ Pagination limitée pour dropdown
      console.log("Sources response:", res.data);
      setSources(res.data.data || []); 
    } catch (error) {
      console.error("Error fetching sources:", error);
    }
  };

  const fetchSummarySources = async (page = 1) => {
    try {
      const res = await api.get(`/summary-sources?page=${page}&per_page=10`);
      console.log("Summary sources data received:", res.data);
      console.log("Summary sources type:", typeof res.data.data);
      console.log("First summary source:", res.data.data?.[0]);
      console.log("Summary sources keys:", res.data.data?.[0] ? Object.keys(res.data.data[0]) : 'No data');
      
      setSummarySources(res.data.data || []);
      setSummaryPagination({
        current_page: res.data.current_page || 1,
        last_page: res.data.last_page || 1,
        per_page: res.data.per_page || 10,
        total: res.data.total || 0
      });
    } catch (error) {
      console.error("Error fetching summary sources:", error);
    }
  };

  const checkDuplicate = (clientId, sourceId, excludeId = null) => {
    return safeBacklinks.some(backlink => 
      backlink.client_id === clientId && 
      backlink.source_site_id === sourceId && 
      backlink.id !== excludeId
    );
  };

  const addBacklink = async (e) => {
    e.preventDefault();
    if (checkDuplicate(formData.client_id, formData.source_site_id)) {
      const sourceSite = safeSources.find(s => s.id === formData.source_site_id);
      const confirmDuplicate = window.confirm(
        `⚠️ This client already has a backlink on "${sourceSite?.domain || 'Unknown site'}".\n\nDo you want to continue adding another backlink on the same source?`
      );
      if (!confirmDuplicate) return;
    }

    try {
      const source = safeSources.find(s => s.id === formData.source_site_id);
      const submitData = {
        ...formData,
        quality_score: source?.quality_score || 3,
        traffic_estimated: parseInt(source?.traffic_estimated || source?.traffic || 0) 
      };
      const res = await api.post("/backlinks", submitData);
      setBacklinks([...safeBacklinks, res.data]);
      resetForm();
      setShowForm(false);
      alert("Backlink created successfully!");
      
      fetchBacklinks(1);
    } catch (error) {
      alert("Error adding backlink");
    }
  };

  const updateBacklink = async (e) => {
    e.preventDefault();
    try {
      const source = safeSources.find(s => s.id === formData.source_site_id);
      const submitData = {
        ...formData,
        quality_score: source?.quality_score || 3,
        traffic_estimated: parseInt(source?.traffic_estimated || source?.traffic || 0)
      };
      const res = await api.put(`/backlinks/${editingBacklink.id}`, submitData);
      setBacklinks(safeBacklinks.map(b => b.id === editingBacklink.id ? res.data : b));
      resetForm();
      setEditingBacklink(null);
      setShowForm(false);
      alert("Backlink updated successfully!");
      fetchBacklinks(1);
    } catch (error) {
      alert("Error updating backlink");
    }
  };

  const deleteBacklink = async (id) => {
    if (window.confirm("Are you sure?")) {
      try {
        await api.delete(`/backlinks/${id}`);
        setBacklinks(safeBacklinks.filter(b => b.id !== id));
      
        fetchBacklinks(1);
      } catch (error) {
        alert("Error deleting backlink");
      }
    }
  };

  const editBacklink = (backlink) => {
    setEditingBacklink(backlink);
    setFormData({ ...backlink });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      source_site_id: "",
      type: "Guest Post",
      link_type: "DoFollow",
      target_url: "",
      anchor_text: "",
      placement_url: "",
      date_added: new Date().toISOString().split('T')[0],
      status: "Pending",
      cost: "",
      quality_score: 3,
      traffic_estimated: 0
    });
  };

  const handleTypeChange = async (sourceId, newType) => {
  
    const associatedBacklink = backlinks.find(b => b.source_site_id === sourceId);
    
    if (!associatedBacklink) {
     
      alert('No backlink found for this source site. Please create a backlink first.');
      return;
    }

    try {
     
      const res = await api.put(`/backlinks/${associatedBacklink.id}`, {
        client_id: associatedBacklink.client_id,
        source_site_id: associatedBacklink.source_site_id,
        type: newType,
        target_url: associatedBacklink.target_url,
        anchor_text: associatedBacklink.anchor_text,
        placement_url: associatedBacklink.placement_url,
        date_added: associatedBacklink.date_added,
        status: associatedBacklink.status,
        cost: associatedBacklink.cost,
        quality_score: associatedBacklink.quality_score,
        traffic_estimated: associatedBacklink.traffic_estimated
      });
      
      
      setBacklinks(safeBacklinks.map(b => b.id === associatedBacklink.id ? res.data : b));
      
      fetchBacklinks(1);
      console.log('Type updated successfully!');
    } catch (error) {
      console.error('Error updating backlink type:', error);
      alert('Error updating type');
    }
  };

  const handleLinkTypeChange = async (sourceId, newLinkType) => {
   
    const associatedBacklink = backlinks.find(b => b.source_site_id === sourceId);
    
    if (!associatedBacklink) {
      
      alert('No backlink found for this source site. Please create a backlink first.');
      return;
    }

    try {
     
      const res = await api.put(`/backlinks/${associatedBacklink.id}`, {
        client_id: associatedBacklink.client_id,
        source_site_id: associatedBacklink.source_site_id,
        type: associatedBacklink.type,
        link_type: newLinkType,
        target_url: associatedBacklink.target_url,
        anchor_text: associatedBacklink.anchor_text,
        placement_url: associatedBacklink.placement_url,
        date_added: associatedBacklink.date_added,
        status: associatedBacklink.status,
        cost: associatedBacklink.cost,
        quality_score: associatedBacklink.quality_score,
        traffic_estimated: associatedBacklink.traffic_estimated
      });
      
      
      setBacklinks(safeBacklinks.map(b => b.id === associatedBacklink.id ? res.data : b));
     
      fetchBacklinks(1);
      console.log('Link type updated successfully!');
    } catch (error) {
      console.error('Error updating backlink link type:', error);
      alert('Error updating link type');
    }
  };

  const handleSummaryLinkTypeChange = async (sourceId, newLinkType) => {
    try {
      // Trouver le backlink correspondant à ce site source
      const associatedBacklink = safeBacklinks.find(b => b.source_site_id === sourceId);
      
      if (!associatedBacklink) {
        console.error('No backlink found for this source site');
        alert('No backlink found for this source site');
        return;
      }
      
      // Mettre à jour le backlink avec le nouveau link_type
      const res = await api.put(`/backlinks/${associatedBacklink.id}`, {
        link_type: newLinkType
      });
      
      // Mettre à jour le backlink dans l'état local
      setBacklinks(safeBacklinks.map(b => 
        b.id === associatedBacklink.id ? { ...b, link_type: newLinkType } : b
      ));
      
      // Rafraîchir immédiatement les backlinks pour garantir la cohérence
      await fetchBacklinks(1);
      
      // Rafraîchir les données summary pour voir le changement
      await fetchSummarySources(summaryPagination.current_page);
      console.log('Backlink link type updated successfully!');
    } catch (error) {
      console.error('Error updating backlink link type:', error);
      alert('Error updating link type');
    }
  };

  const handleDeleteSummarySource = async (sourceId) => {
    if (!window.confirm("Are you sure you want to delete this source site?")) return;
    
    try {
      await api.delete(`/summary-sources/${sourceId}`);
      await fetchSummarySources(summaryPagination.current_page); // Rafraîchir la liste après suppression
      console.log('Summary source deleted successfully!');
    } catch (error) {
      console.error('Error deleting summary source:', error);
      if (error.response?.status === 403) {
        alert('Ce site source ne peut pas être supprimé car il est utilisé par des backlinks existants.');
      } else if (error.response?.status === 404) {
        alert('Site source non trouvé ou déjà supprimé');
      } else {
        alert("Erreur lors de la suppression du site source");
      }
    }
  };

  
  const handlePageChange = (newPage) => {
    // Validation stricte pour éviter les réinitialisations accidentelles
    if (newPage >= 1 && newPage <= summaryPagination.last_page && newPage !== summaryPagination.current_page) {
      console.log(`Changing to page ${newPage} from page ${summaryPagination.current_page}`);
      fetchSummarySources(newPage);
      fetchBacklinks(newPage, searchTerm); // Inclure le terme de recherche
    } else {
      console.log(`Invalid page change: ${newPage} (current: ${summaryPagination.current_page}, max: ${summaryPagination.last_page})`);
    }
  };

  const renderPaginationNumbers = () => {
    const { current_page, last_page } = summaryPagination;
    const pages = [];
    
    
    if (current_page > 3) {
      pages.push(1);
      if (current_page > 4) {
        pages.push('...');
      }
    }
    
    
    for (let i = Math.max(1, current_page - 2); i <= Math.min(last_page, current_page + 2); i++) {
      pages.push(i);
    }
    
   
    if (current_page < last_page - 2) {
      if (current_page < last_page - 3) {
        pages.push('...');
      }
      pages.push(last_page);
    }
    
    return pages;
  };

  const renderPaginationControls = () => {
    return (
      <div className="pagination-controls">
        <div className="pagination-info">
          <span>
            Affichage de {((summaryPagination.current_page - 1) * summaryPagination.per_page) + 1} à{' '}
            {Math.min(summaryPagination.current_page * summaryPagination.per_page, summaryPagination.total)} sur{' '}
            {summaryPagination.total} résultats
          </span>
        </div>
      
        <div className="pagination-buttons">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(summaryPagination.current_page - 1)}
            disabled={summaryPagination.current_page === 1}
          >
            Précédent
          </button>
          
          {renderPaginationNumbers().map((page, index) => (
            <button
              key={index}
              className={`pagination-btn ${page === summaryPagination.current_page ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}
              onClick={() => page !== '...' && handlePageChange(page)}
              disabled={page === '...'}
            >
              {page}
            </button>
          ))}
          
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(summaryPagination.current_page + 1)}
            disabled={summaryPagination.current_page === summaryPagination.last_page}
          >
            Suivant
          </button>
        </div>
      </div>
    );
  };

  // Fonctions de pagination pour les backlinks
  const handleBacklinksPageChange = (newPage) => {
    // Validation stricte pour éviter les réinitialisations accidentelles
    if (newPage >= 1 && newPage <= backlinksPagination.last_page && newPage !== backlinksPagination.current_page) {
      console.log(`Changing backlinks to page ${newPage} from page ${backlinksPagination.current_page}`);
      fetchBacklinks(newPage, searchTerm); // Inclure le terme de recherche
    } else {
      console.log(`Invalid backlinks page change: ${newPage} (current: ${backlinksPagination.current_page}, max: ${backlinksPagination.last_page})`);
    }
  };

  const renderBacklinksPaginationNumbers = () => {
    const { current_page, last_page } = backlinksPagination;
    const pages = [];
    
    // Afficher toujours la première page
    if (current_page > 3) {
      pages.push(1);
      if (current_page > 4) {
        pages.push('...');
      }
    }
    
    // Afficher les pages autour de la page actuelle
    for (let i = Math.max(1, current_page - 2); i <= Math.min(last_page, current_page + 2); i++) {
      pages.push(i);
    }
    
    // Afficher la dernière page
    if (current_page < last_page - 2) {
      if (current_page < last_page - 3) {
        pages.push('...');
      }
      pages.push(last_page);
    }
    
    return pages;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Live': return 'status-live';
      case 'Pending': return 'status-pending';
      case 'Lost': return 'status-lost';
      default: return 'status-pending';
    }
  };

  useEffect(() => { 
    fetchBacklinks(1, searchTerm); fetchClients(); fetchSources(); fetchSummarySources(); fetchTypes();
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    fetchBacklinks(1, value); // Toujours retourner à la page 1 lors de la recherche
  };

  // Rafraîchissement automatique des données summary toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      // Préserver la page actuelle lors du rafraîchissement
      // Seulement rafraîchir si nous ne sommes pas déjà sur la page 1 ou si les données sont valides
      const currentPage = summaryPagination.current_page;
      const totalPages = summaryPagination.last_page;
      
      if (currentPage >= 1 && currentPage <= totalPages) {
        fetchSummarySources(currentPage);
        fetchBacklinks(backlinksPagination.current_page); // Rafraîchir aussi les backlinks pour garantir la cohérence
      }
    }, 30000); // 30 secondes

    return () => clearInterval(interval); // Nettoyer l'intervalle quand le composant est démonté
  }, [summaryPagination.current_page, summaryPagination.last_page, backlinksPagination.current_page]);

  // Rafraîchissement quand le modal est ouvert
  useEffect(() => {
    if (showSourceSitesView) {
      // Préserver la page actuelle lors du rafraîchissement du modal
      // Seulement rafraîchir si nécessaire pour éviter les appels inutiles
      const currentPage = summaryPagination.current_page;
      const totalPages = summaryPagination.last_page;
      
      if (currentPage >= 1 && currentPage <= totalPages && summarySources.length === 0) {
        console.log('Refreshing summary sources on modal open');
        fetchSummarySources(currentPage);
        fetchBacklinks(backlinksPagination.current_page);
      }
    }
  }, [showSourceSitesView]);

  useEffect(() => {
    if (formData.source_site_id && sources.length > 0) {
      const selectedSource = sources.find(source => source.id === parseInt(formData.source_site_id));
      if (selectedSource) {
        setFormData(prev => ({
          ...prev,
          quality_score: selectedSource.quality_score || 3,
          traffic_estimated: selectedSource.traffic_estimated || 0
        }));
      }
    }
  }, [formData.source_site_id, sources]);

  useEffect(() => {
    if (formData.source_site_id && formData.quality_score) {
      const sourceIndex = sources.findIndex(s => s.id === parseInt(formData.source_site_id));
      if (sourceIndex !== -1) {
        const updatedSources = [...sources];
        updatedSources[sourceIndex] = {
          ...updatedSources[sourceIndex],
          quality_score: formData.quality_score
        };
        setSources(updatedSources);
      }
    }
  }, [formData.quality_score]);

  const handleImportSourceSites = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validation de l'extension
    const fileName = file.name.toLowerCase();
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      alert(`Format de fichier non supporté. Extensions autorisées: ${allowedExtensions.join(', ')}`);
      event.target.value = '';
      return;
    }

    // Validation de la taille (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Le fichier est trop volumineux. Taille maximale: 10MB');
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      
      const response = await api.post('/summary/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log("Import response:", response.data);
      console.log("Import successful, refreshing summary sources...");

      // Rafraîchir les données après l'import
      await fetchSummarySources(1); // Revenir à la page 1 après import

      console.log("Summary sources refreshed after import");
      const message = response.data.message || 'Import réussi !';
      const importedCount = response.data.imported_count || 0;
      const updatedCount = response.data.updated_count || 0;
      const totalCount = response.data.total_processed || 0;
      
      if (updatedCount > 0) {
        alert(`${message} Total traité: ${totalCount} lignes.`);
      } else {
        alert(message);
      }
      
      // Réinitialiser l'input file
      event.target.value = '';
      
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      
      let errorMessage = 'Erreur lors de l\'import: ';
      
      if (error.response) {
        errorMessage += error.response.data?.message || error.response.statusText || 'Erreur serveur';
        
        if (error.response.data?.errors && Array.isArray(error.response.data.errors)) {
          errorMessage += '\n\nDétails:\n' + error.response.data.errors.join('\n');
        }
      } else if (error.request) {
        errorMessage += 'Aucune réponse du serveur';
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
      event.target.value = '';
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    // Prepare CSV data
    const csvData = safeSummarySources.map(source => {
      return {
        Website: source.actual_domain || source.domain || source.website, // Utilise le domaine actuel
        Cost: source.cost == 0 || source.cost === "0" || source.cost === null || source.cost === undefined ? 'Free' : `$${source.cost || 0}`, // Utilise le coût direct du summary
        LinkType: source.backlink_link_type || 'DoFollow', // Utilise uniquement le link_type depuis backlinks
        ContactEmail: source.contact_email || '-', // Utilise l'email direct du summary
        SpamScore: source.spam || 0 // Utilise le spam direct du summary
      };
    });

    // Create CSV content with semicolon delimiter and UTF-8 BOM
    const headers = ['Website', 'Cost', 'Link Type', 'Contact Email', 'Spam Score'];
    const csvContent = [
      '\uFEFF' + headers.join(';'), // Add UTF-8 BOM for Excel
      ...csvData.map(row => [
        `"${row.Website}"`, // Utilise la valeur Website
        row.Cost,
        `"${row.LinkType}"`,
        `"${row.ContactEmail}"`,
        row.SpamScore
      ].join(';'))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename with date
    const today = new Date().toLocaleDateString();
    const filename = `Backlinks_Report_${today}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    // Prepare PDF data
    const pdfData = safeSources.map(source => {
      // Find associated client through backlinks
      const associatedBacklink = safeBacklinks.find(b => b.source_site_id === source.id);
      const associatedClient = associatedBacklink ? safeClients.find(c => c.id === associatedBacklink.client_id) : null;
      
      return [
        source.domain,
        source.cost == 0 || source.cost === "0" || source.cost === null || source.cost === undefined ? 'Free' : `$${associatedBacklink?.cost || 0}`,
        associatedBacklink?.link_type || 'DoFollow',
        associatedClient?.contact_email || '-',
        `${source.spam_score || 0}%`
      ];
    });

    // Create PDF
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();
    
    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Source Sites Summary Report', 14, 20);
    
    // Add date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${today}`, 14, 30);
    
    // Add table using autoTable
    autoTable(doc, {
      head: [['Website', 'Cost', 'Type', 'Email', 'Spam']],
      body: pdfData,
      startY: 40,
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 40 }, // Website
        1: { cellWidth: 20, halign: 'right' }, // Cost
        2: { cellWidth: 25, halign: 'center' }, // Type
        3: { cellWidth: 50 }, // Email
        4: { cellWidth: 20, halign: 'center' } // Spam
      }
    });
    
    // Save PDF
    doc.save(`Backlinks_Report_${today}.pdf`);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="backlinks">
      <Navbar />
      <div className="backlinks-content">
        <div className="backlinks-header">
          <div className="header-left">
            <h2>Backlinks Management</h2>
            <div className="search-container">
              <span className="search-icon">🔍</span>
              <input 
                type="text"
                placeholder="Search by Client Name or Source Website..."
                value={searchTerm}
                onChange={handleSearch}
                className="search-input"
              />
            </div>
          </div>
          <div className="header-buttons">
            <button className="source-sites-view-btn" onClick={() => setShowSourceSitesView(true)}>
              Source Sites View
            </button>
            <button className="add-backlink-btn" onClick={() => { resetForm(); setEditingBacklink(null); setShowForm(!showForm); }}>
              {editingBacklink ? 'Edit Backlink' : 'Add Backlink'}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="backlink-form-container">
            <form onSubmit={editingBacklink ? updateBacklink : addBacklink} className="backlink-form">
              <div className="form-row">
                <select value={formData.client_id} onChange={e=>setFormData({...formData, client_id: e.target.value})} required>
                  <option value="">Select Client</option>
                  {safeClients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
                <select value={formData.source_site_id} onChange={e=>setFormData({...formData, source_site_id: e.target.value})} required>
                  <option value="">Select Source</option>
                  {safeSources.map(s => <option key={s.id} value={s.id}>{s.domain}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>TARGET URL</label>
                  <input value={formData.target_url} onChange={e=>setFormData({...formData, target_url: e.target.value})} placeholder="ex: https://monsite.com/page" required />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>ANCHOR TEXT</label>
                  <input value={formData.anchor_text} onChange={e=>setFormData({...formData, anchor_text: e.target.value})} placeholder="ex: Meilleure Agence SEO" />
                </div>
              </div>
              <div className="form-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>TYPE</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <select 
                          style={{ flex: 1, width: '100%' }}
                          value={formData.type} 
                          onChange={e=>setFormData({...formData, type: e.target.value})}
                        >
                          <option value="">Select Type</option>
                          {dynamicTypes.map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      {isAdmin && (
                        <>
                          <button 
                            type="button" 
                            onClick={() => setShowAddType(!showAddType)}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              backgroundColor: '#fff',
                              cursor: 'pointer',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              minWidth: '40px',
                              height: '40px'
                            }}
                          >
                            +
                          </button>
                          {formData.type && (
                            <button
                              type="button"
                              onClick={() => {
                                const typeToDelete = dynamicTypes.find(t => t.name === formData.type);
                                if (typeToDelete && window.confirm(`Delete type "${formData.type}"?`)) {
                                  handleDeleteType(typeToDelete.id, formData.type);
                                }
                              }}
                              style={{
                                padding: '8px 12px',
                                border: '1px solid #dc3545',
                                borderRadius: '4px',
                                backgroundColor: '#fff',
                                color: '#dc3545',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                minWidth: '40px',
                                height: '40px'
                              }}
                              title={`Delete "${formData.type}"`}
                            >
                              -
                            </button>
                          )}
                        </>
                      )}
                    </div>

                  {isAdmin && showAddType && (
                    <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                      <input 
                        type="text" 
                        placeholder="ex: Press Release" 
                        value={newTypeName} 
                        onChange={e => setNewTypeName(e.target.value)} 
                        style={{ flex: 1 }}
                      />
                      <button type="button" onClick={handleAddNewType}>Add</button>
                    </div>
                  )}
                </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>LINK TYPE</label>
                  <select value={formData.link_type} onChange={e=>setFormData({...formData, link_type: e.target.value})}>
                    <option value="DoFollow">DoFollow</option>
                    <option value="NoFollow">NoFollow</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>PLACEMENT URL</label>
                  <input value={formData.placement_url} onChange={e=>setFormData({...formData, placement_url: e.target.value})} placeholder="ex: https://blog.com/article" />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>DATE ADDED</label>
                  <input type="date" value={formData.date_added} onChange={e=>setFormData({...formData, date_added: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>STATUS</label>
                  <select value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})}>
                    <option value="Live">Live</option>
                    <option value="Pending">Pending</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>COST ($)</label>
                  <input type="number" min="0" value={formData.cost} onChange={e=>setFormData({...formData, cost: e.target.value})} placeholder="Cost (0 = Free)" />
                </div>
                {isAdmin && (
                  <div className="quality-score-container">
                    <label className="quality-label">Quality Score: {formData.quality_score} ⭐</label>
                    <div className="quality-progress-bar">
                      <div 
                        className="quality-progress-fill" 
                        style={{
                          width: `${(formData.quality_score / 5) * 100}%`,
                          backgroundColor: formData.quality_score >= 4 ? '#10B981' : 
                                         formData.quality_score >= 3 ? '#F59E0B' : '#EF4444'
                        }}
                      ></div>
                    </div>
                    <select 
                      value={formData.quality_score} 
                      onChange={e=>setFormData({...formData, quality_score: parseInt(e.target.value)})}
                      className="quality-select"
                    >
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ⭐</option>)}
                    </select>
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="form-row">
                  <div className="traffic-container">
                    <label className="traffic-label">Traffic: {(formData.traffic_estimated || 0).toLocaleString()} visitors/month 📊</label>
                    <div className="traffic-display">
                      <span className="traffic-value">{(formData.traffic_estimated || 0).toLocaleString()}</span>
                      <span className="traffic-unit">visitors/month</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="submit-btn">Save</button>
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="backlinks-table-container">
          <table className="backlinks-table">
            <thead>
              <tr>
                <th>Client</th><th>Source</th><th>Date</th><th>Status</th><th>Cost</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {safeBacklinks.map(b => (
                <tr key={b.id}>
                  <td>{safeClients.find(c => c.id === b.client_id)?.company_name || '...'}</td>
                  <td>{safeSources.find(s => s.id === b.source_site_id)?.domain || '...'}</td>
                  <td>{new Date(b.date_added || b.created_at || b.date).toLocaleDateString('fr-FR')}</td>
                  <td><span className={`status ${getStatusColor(b.status)}`}>{b.status}</span></td>
                  <td>
                    {b.cost == 0 || b.cost === "0" || b.cost === null || b.cost === undefined ? 
                      <span className="cost-free">Free</span> : 
                      `$${b.cost || '0'}`
                    }
                  </td>
                  <td className="actions">
                    <button className="edit-btn" onClick={() => editBacklink(b)}>Edit</button>
                    {isAdmin && <button className="delete-btn" onClick={() => deleteBacklink(b.id)}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Contrôles de pagination pour les backlinks */}
        {backlinksPagination.total > 0 && (
          <div className="pagination-controls">
            <div className="pagination-info">
              <span>
                Affichage de {((backlinksPagination.current_page - 1) * backlinksPagination.per_page) + 1} à{' '}
                {Math.min(backlinksPagination.current_page * backlinksPagination.per_page, backlinksPagination.total)} sur{' '}
                {backlinksPagination.total} résultats
              </span>
            </div>
            
            <div className="pagination-buttons">
              <button
                className="pagination-btn"
                onClick={() => handleBacklinksPageChange(backlinksPagination.current_page - 1)}
                disabled={backlinksPagination.current_page === 1}
              >
                Précédent
              </button>
              
              {renderBacklinksPaginationNumbers().map((page, index) => (
                <button
                  key={index}
                  className={`pagination-btn ${page === backlinksPagination.current_page ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}
                  onClick={() => page !== '...' && handleBacklinksPageChange(page)}
                  disabled={page === '...'}
                >
                  {page}
                </button>
              ))}
              
              <button
                className="pagination-btn"
                onClick={() => handleBacklinksPageChange(backlinksPagination.current_page + 1)}
                disabled={backlinksPagination.current_page === backlinksPagination.last_page}
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Source Sites View Modal */}
      {showSourceSitesView && (
        <div className="modal-overlay">
          <div className="modal source-sites-modal">
            <div className="modal-header">
              <div className="modal-header-left">
                <h3>Source Sites Summary</h3>
              </div>
              <div className="modal-header-right">
                <button className="import-excel-btn" onClick={() => document.getElementById('sources-import-file-input').click()}>
                  Import Excel
                </button>
                <input 
                  id="sources-import-file-input" 
                  type="file" 
                  accept=".csv,.xlsx,.xls" 
                  style={{ display: 'none' }} 
                  onChange={handleImportSourceSites}
                />
                <button className="export-csv-btn" onClick={exportToCSV}>
                  Export Excel
                </button>
                <button className="export-pdf-btn" onClick={exportToPDF}>
                  Export PDF
                </button>
                <button className="close-btn" onClick={() => setShowSourceSitesView(false)}>×</button>
              </div>
            </div>
            <div className="modal-content">
              <div className="source-sites-table-container">
                {sources.length === 0 ? (
                  <div className="no-sources">
                    <p>No source sites found</p>
                  </div>
                ) : (
                  <table className="source-sites-summary-table">
                    <thead>
                      <tr>
                        <th>Website</th>
                        <th>Cost</th>
                        <th>Link Type</th>
                        <th>Contact Email</th>
                        <th>Spam</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeSummarySources.map(source => {
                        return (
                          <tr key={source.id}>
                            <td className="website-cell">
                              <a href={`https://${source.actual_domain || source.domain || source.website || 'example.com'}`} target="_blank" rel="noopener noreferrer">
                                {source.actual_domain || source.domain || source.website || 'No domain'}
                              </a>
                            </td>
                            <td className="cost-cell">
                              {source.cost == 0 || source.cost === "0" || source.cost === null || source.cost === undefined ? 
                                <span className="cost-free">Free</span> : 
                                `$${source.cost || '0'}`
                              }
                            </td>
                            <td className="link-type-cell">
                              <span className={`link-type-badge ${(source.backlink_link_type || 'DoFollow') === 'DoFollow' ? 'dofollow' : 'nofollow'}`}>
                                {source.backlink_link_type || 'DoFollow'}
                              </span>
                            </td>
                            <td className="email-cell">
                              {source.contact_email || '-'}
                            </td>
                            <td className="spam-cell">
                              <span className={`spam-score ${source.spam > 30 ? 'spam-danger' : 'spam-safe'}`}>
                                {source.spam || 0}%
                              </span>
                            </td>
                            <td className="actions-cell">
                              <button 
                                className="delete-btn" 
                                onClick={() => handleDeleteSummarySource(source.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              
              {/* Contrôles de pagination */}
              {summaryPagination.total > 0 && renderPaginationControls()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}