<?php

namespace App\Http\Controllers;

use App\Models\Backlink;
use App\Models\Client;
use App\Models\SourceSite;
use App\Models\SourceSummary;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\IOFactory;

class BacklinkController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 10); // 10 par défaut
        $page = $request->get('page', 1); // Page 1 par défaut
        $search = $request->get('search', ''); // Terme de recherche
        
        $query = Backlink::with(['client','sourceSite'])->orderBy('created_at', 'desc');
        
        // Ajouter la recherche si un terme est fourni
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->whereHas('client', function($clientQuery) use ($search) {
                    $clientQuery->where('company_name', 'LIKE', '%' . $search . '%');
                })
                ->orWhereHas('sourceSite', function($sourceQuery) use ($search) {
                    $sourceQuery->where('domain', 'LIKE', '%' . $search . '%');
                });
            });
        }
        
        $backlinks = $query->paginate($perPage, ['*'], 'page', $page);

        return $backlinks;
    }

    public function all()
    {
        return Backlink::with(['client','sourceSite'])->orderBy('created_at', 'desc')->get();
    }

    public function dashboardStats()
    {
        // Statistiques complètes basées sur toute la base de données
        $currentMonth = now()->month;
        $currentYear = now()->year;
        
        // Calcul mensuel robuste : vérifie date_added puis created_at
        $monthlyBacklinks = Backlink::where(function($query) use ($currentMonth, $currentYear) {
                $query->whereMonth('date_added', $currentMonth)
                      ->whereYear('date_added', $currentYear);
            })->orWhere(function($query) use ($currentMonth, $currentYear) {
                $query->whereNull('date_added')
                      ->whereMonth('created_at', $currentMonth)
                      ->whereYear('created_at', $currentYear);
            })->count();
        
        return response()->json([
            'total_backlinks' => Backlink::count(),
            'total_clients' => \App\Models\Client::count(),
            'total_sources' => \App\Models\SourceSite::count(),
            'live_backlinks' => Backlink::where('status', 'Live')->count(),
            'pending_backlinks' => Backlink::where('status', 'Pending')->count(),
            'lost_backlinks' => Backlink::where('status', 'Lost')->count(),
            'total_cost' => Backlink::sum('cost'),
            'dofollow_backlinks' => Backlink::where('link_type', 'DoFollow')->count(),
            'nofollow_backlinks' => Backlink::where('link_type', 'NoFollow')->count(),
            'monthly_backlinks' => $monthlyBacklinks,
        ]);
    }

    public function getSummarySources(Request $request)
    {
        // Récupérer les données de la table source_summaries avec jointure vers source_sites et backlinks
        $perPage = $request->get('per_page', 10); // 10 par défaut
        $page = $request->get('page', 1); // Page 1 par défaut
        
        $summaryData = SourceSummary::leftJoin('source_sites', 'source_summaries.website', '=', 'source_sites.domain')
            ->leftJoin('backlinks', function($join) {
                $join->on('source_sites.id', '=', 'backlinks.source_site_id')
                     ->where('backlinks.status', '=', 'Live') // Prendre le backlink actif
                     ->orderBy('backlinks.updated_at', 'desc'); // Prendre le plus récent
            })
            ->select(
                'source_summaries.*',
                'source_sites.domain as actual_domain', // Récupérer le domaine actuel depuis source_sites
                'backlinks.link_type as backlink_link_type' // Récupérer le link_type depuis backlinks
            )
            ->orderBy('source_summaries.created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return $summaryData;
    }

    public function updateSummarySource(Request $request, $id)
    {
        try {
            $summary = SourceSummary::findOrFail($id);
            
            $validated = $request->validate([
                'link_type' => 'required|in:DoFollow,NoFollow'
            ]);

            $summary->update([
                'link_type' => $validated['link_type'],
                'updated_at' => now()
            ]);

            return response()->json($summary);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error updating summary source: ' . $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        // Récupérer les types dynamiques disponibles
        $availableTypes = \App\Models\BacklinkType::pluck('name')->toArray();
        $defaultTypes = ['Guest Post', 'Directory', 'Profile', 'Comment', 'Other'];
        $allTypes = array_merge($defaultTypes, $availableTypes);
        
        $data = $request->validate([
            'client_id'=>'required|exists:clients,id',
            'source_site_id'=>'required|exists:source_sites,id',
            'type'=>'required|string|in:' . implode(',', $allTypes),
            'link_type'=>'required|in:DoFollow,NoFollow',
            'target_url'=>'required|url',
            'anchor_text'=>'required|string',
            'placement_url'=>'nullable|url',
            'date_added'=>'required|date',
            'status'=>'required|in:Pending,Live,Lost',
            'cost'=>'nullable|numeric|min:0',
            'quality_score'=>'nullable|integer|min:1|max:5',
            'traffic_estimated'=>'nullable|integer',
        ]);

        // Vérification doublon
        $exists = Backlink::where('client_id',$data['client_id'])
                          ->where('source_site_id',$data['source_site_id'])
                          ->first();
        if($exists){
            return response()->json(['message'=>'Duplicate detected'], 409);
        }

        $backlink = Backlink::create($data);
        
        // Renvoyer l'objet complet avec les relations
        return response()->json($backlink->load(['client', 'sourceSite']), 201);
    }

    public function show($id)
    {
        return Backlink::with(['client','sourceSite'])->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $backlink = Backlink::findOrFail($id);
        
        // Récupérer les types dynamiques disponibles
        $availableTypes = \App\Models\BacklinkType::pluck('name')->toArray();
        $defaultTypes = ['Guest Post', 'Directory', 'Profile', 'Comment', 'Other'];
        $allTypes = array_merge($defaultTypes, $availableTypes);
        
        $data = $request->validate([
            'client_id'=>'sometimes|required|exists:clients,id',
            'source_site_id'=>'sometimes|required|exists:source_sites,id',
            'type'=>'sometimes|required|string|in:' . implode(',', $allTypes),
            'link_type'=>'sometimes|required|in:DoFollow,NoFollow',
            'target_url'=>'sometimes|required|url',
            'anchor_text'=>'required|string',
            'placement_url'=>'nullable|url',
            'date_added'=>'sometimes|required|date',
            'status'=>'required|in:Pending,Live,Lost',
            'cost'=>'nullable|numeric|min:0',
            'quality_score'=>'nullable|integer|min:1|max:5',
            'traffic_estimated'=>'nullable|integer',
        ]);
        $backlink->update($data);
        
        // Renvoyer l'objet complet avec les relations
        return response()->json($backlink->load(['client', 'sourceSite']));
    }

    public function destroy($id)
    {
        Backlink::findOrFail($id)->delete();
        return response()->json(['message'=>'Deleted']);
    }

    public function importSourceSites(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:10240' // Max 10MB
        ]);

        try {
            $file = $request->file('file');
            if (!$file) {
                return response()->json(['message' => 'No file received'], 400);
            }

            $filePath = $file->getPathname();
            $fileName = $file->getClientOriginalName();
            $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            
            $allowedExtensions = ['csv', 'xlsx', 'xls'];
            if (!in_array($fileExtension, $allowedExtensions)) {
                return response()->json([
                    'message' => 'Unsupported file format. Use CSV or XLSX.',
                    'allowed_extensions' => $allowedExtensions
                ], 400);
            }

            // Lire le fichier selon l'extension
            $data = [];
            if ($fileExtension === 'csv') {
                $data = $this->readCsvFile($filePath);
            } elseif (in_array($fileExtension, ['xlsx', 'xls'])) {
                $data = $this->readExcelFile($filePath);
            }

            if (empty($data)) {
                return response()->json(['message' => 'No data found in file'], 400);
            }

            $importedCount = 0;
            $errors = [];

            foreach ($data as $index => $row) {
                try {
                    // Validation pour ignorer la ligne d'en-tête
                    $website = $row['website'] ?? $row['Website'] ?? $row['domain'] ?? $row['Domain'] ?? '-';
                    
                    // Skip header row if website column contains header names
                    if (strtolower($website) === 'website' || strtolower($website) === 'domain') {
                        continue;
                    }
                    
                    // Mapping flexible des en-têtes
                    $cost = $row['cost'] ?? $row['Cost'] ?? $row['price'] ?? $row['Price'] ?? '-';
                    $linkType = $row['link type'] ?? $row['Link Type'] ?? $row['link_type'] ?? $row['linktype'] ?? 'DoFollow';
                    $contactEmail = $row['contact email'] ?? $row['Contact Email'] ?? $row['email'] ?? $row['Email'] ?? '-';
                    $spam = $row['spam'] ?? $row['Spam'] ?? $row['spam score'] ?? $row['Spam Score'] ?? '-';

                    // Validation du link_type
                    $validLinkTypes = ['DoFollow', 'NoFollow', 'dofollow', 'nofollow'];
                    if (!in_array($linkType, $validLinkTypes)) {
                        $linkType = 'DoFollow'; // Valeur par défaut
                    }

                    // Conversion du coût en nombre si possible
                    $costValue = is_numeric($cost) ? (float)$cost : 0;

                    // Conversion du spam score en nombre si possible
                    $spamValue = is_numeric($spam) ? (int)$spam : 0;

                    // Créer le site source directement
                    $sourceSite = SourceSite::create([
                        'domain' => $website,
                        'cost' => $costValue,
                        'link_type' => ucfirst(strtolower($linkType)),
                        'contact_email' => $contactEmail,
                        'spam_score' => $spamValue,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);

                    $importedCount++;

                } catch (\Exception $e) {
                    $errors[] = "Line " . ($index + 2) . ": Error - " . $e->getMessage();
                }
            }

            $message = "Import completed. {$importedCount} source sites imported successfully.";
            if (!empty($errors)) {
                $message .= " " . count($errors) . " errors encountered.";
            }

            return response()->json([
                'message' => $message,
                'imported_count' => $importedCount,
                'total_processed' => count($data),
                'errors' => $errors
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error during import: ' . $e->getMessage()], 500);
        }
    }

    public function importBacklinks(Request $request)
    {
        // Debug: Vérifier si le fichier est bien reçu
        \Log::info('Import request received', [
            'hasFile' => $request->hasFile('file'),
            'file' => $request->file('file'),
            'allFiles' => $request->allFiles(),
            'request' => $request->all()
        ]);

        $request->validate([
            'file' => 'required|file|max:10240' // Max 10MB, sans mimes pour le moment
        ]);

        try {
            $file = $request->file('file');
            if (!$file) {
                return response()->json(['message' => 'No file received'], 400);
            }

            $filePath = $file->getPathname();
            $fileName = $file->getClientOriginalName();
            $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            
            // Debug: Vérifier l'extension
            \Log::info('File info', [
                'fileName' => $fileName,
                'extension' => $fileExtension,
                'mimeType' => $file->getMimeType(),
                'size' => $file->getSize()
            ]);

            // Validation manuelle de l'extension
            $allowedExtensions = ['csv', 'xlsx', 'xls'];
            if (!in_array($fileExtension, $allowedExtensions)) {
                return response()->json([
                    'message' => 'Format de fichier non supporté. Utilisez CSV ou XLSX. Extensions autorisées: ' . implode(', ', $allowedExtensions),
                    'file_info' => [
                        'name' => $fileName,
                        'extension' => $fileExtension,
                        'allowed' => $allowedExtensions
                    ]
                ], 400);
            }

            // Lire le fichier selon l'extension
            $data = [];
            if ($fileExtension === 'csv') {
                $data = $this->readCsvFile($filePath);
            } elseif (in_array($fileExtension, ['xlsx', 'xls'])) {
                $data = $this->readExcelFile($filePath);
            }

            if (empty($data)) {
                return response()->json(['message' => 'No data found in file'], 400);
            }

            $importedCount = 0;
            $errors = [];

            foreach ($data as $index => $row) {
                try {
                    // Validation pour ignorer la ligne d'en-tête
                    $websiteDomain = $row['Website'] ?? $row['website'] ?? $row['domain'] ?? $row['Domain'] ?? null;
                    
                    // Skip header row if website/domain column contains header names
                    if ($websiteDomain && (strtolower($websiteDomain) === 'website' || strtolower($websiteDomain) === 'domain')) {
                        continue;
                    }
                    
                    // Récupérer le client par email
                    $clientEmail = $row['Contact Email'] ?? $row['contact email'] ?? $row['Email'] ?? $row['email'] ?? null;
                    $client = null;
                    if (!empty($clientEmail)) {
                        $client = Client::where('contact_email', $clientEmail)->first();
                    }

                    // Récupérer le site source par domaine
                    $source = null;
                    if (!empty($websiteDomain)) {
                        $source = SourceSite::where('domain', $websiteDomain)->first();
                    }

                    if (!$client) {
                        $errors[] = "Line " . ($index + 2) . ": Client not found for email '" . ($clientEmail ?? 'empty') . "'";
                        continue;
                    }

                    if (!$source) {
                        $errors[] = "Line " . ($index + 2) . ": Source site not found for domain '" . ($websiteDomain ?? 'empty') . "'";
                        continue;
                    }

                    // Créer le backlink
                    $backlinkData = [
                        'client_id' => $client->id,
                        'source_site_id' => $source->id,
                        'type' => $row['Type'] ?? $row['type'] ?? 'Guest Post',
                        'link_type' => $row['Link Type'] ?? $row['link_type'] ?? 'DoFollow',
                        'target_url' => $row['Target URL'] ?? $row['target_url'] ?? '',
                        'anchor_text' => $row['Anchor Text'] ?? $row['anchor_text'] ?? '',
                        'placement_url' => $row['Placement URL'] ?? $row['placement_url'] ?? '',
                        'date_added' => $row['Date Added'] ?? $row['date_added'] ?? now()->format('Y-m-d'),
                        'status' => $row['Status'] ?? $row['status'] ?? 'Pending',
                        'cost' => is_numeric($row['Cost'] ?? $row['cost']) ? ($row['Cost'] ?? $row['cost']) : 0,
                        'quality_score' => !empty($row['Quality Score'] ?? $row['quality_score']) ? ($row['Quality Score'] ?? $row['quality_score']) : 3,
                        'traffic_estimated' => is_numeric($row['Traffic Estimated'] ?? $row['traffic_estimated']) ? ($row['Traffic Estimated'] ?? $row['traffic_estimated']) : null,
                    ];

                    Backlink::create($backlinkData);
                    $importedCount++;

                } catch (\Exception $e) {
                    $errors[] = "Line " . ($index + 2) . ": Error - " . $e->getMessage();
                }
            }

            $message = "Import completed. {$importedCount} backlinks imported successfully.";
            if (!empty($errors)) {
                $message .= " " . count($errors) . " errors encountered.";
            }

            return response()->json([
                'message' => $message,
                'imported_count' => $importedCount,
                'total_processed' => count($data),
                'errors' => $errors
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error during import: ' . $e->getMessage()], 500);
        }
    }

    private function readCsvFile($filePath)
    {
        $data = [];
        
        try {
            // Try to detect and handle encoding
            $content = file_get_contents($filePath);
            if ($content === false) {
                return $data;
            }

            // Check for UTF-16 BOM and convert if needed
            if (substr($content, 0, 2) === "\xFF\xFE" || substr($content, 0, 2) === "\xFE\xFF") {
                // UTF-16 detected, convert to UTF-8
                $content = mb_convert_encoding($content, 'UTF-8', 'UTF-16');
            } elseif (preg_match('/\x00/', $content)) {
                // Likely UTF-16 without BOM, try to convert
                $content = mb_convert_encoding($content, 'UTF-8', 'UTF-16LE');
            }

            // Create a temporary file with UTF-8 content
            $tempFile = tempnam(sys_get_temp_dir(), 'csv_import_');
            file_put_contents($tempFile, $content);

            if (($handle = fopen($tempFile, 'r')) !== FALSE) {
                // Try different delimiters
                $delimiters = [',', ';', "\t"];
                $header = null;
                $workingDelimiter = null;

                foreach ($delimiters as $delimiter) {
                    rewind($handle);
                    $testHeader = fgetcsv($handle, 1000, $delimiter);
                    if ($testHeader && count($testHeader) > 1) {
                        $header = $testHeader;
                        $workingDelimiter = $delimiter;
                        break;
                    }
                }

                if ($header === FALSE || $header === null) {
                    fclose($handle);
                    unlink($tempFile);
                    return $data;
                }

                // Nettoyer les en-têtes (supprimer BOM et espaces)
                $header = array_map(function($value) {
                    return trim(preg_replace('/[\x00-\x1F\x7F]/', '', $value));
                }, $header);

                // Normaliser les noms de colonnes (insensible à la casse)
                $header = array_map('strtolower', $header);

                $rowIndex = 0;
                while (($row = fgetcsv($handle, 1000, $workingDelimiter)) !== FALSE) {
                    if (count($header) === count($row)) {
                        // Clean row data
                        $cleanRow = array_map(function($value) {
                            return trim(preg_replace('/[\x00-\x1F\x7F]/', '', $value));
                        }, $row);
                        
                        $rowData = array_combine($header, $cleanRow);
                        if ($rowData !== false) {
                            $data[] = $rowData;
                        }
                    }
                    $rowIndex++;
                }
                fclose($handle);
            }
            
            // Clean up temp file
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }
            
        } catch (\Exception $e) {
            \Log::error('Error reading CSV file: ' . $e->getMessage());
        }
        
        return $data;
    }

    private function readExcelFile($filePath)
    {
        $data = [];
        
        try {
            $spreadsheet = IOFactory::load($filePath);
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            if (empty($rows)) {
                return $data;
            }

            // Première ligne = en-têtes
            $header = array_map('strtolower', array_map('trim', array_shift($rows)));
            
            foreach ($rows as $row) {
                if (count($header) === count($row)) {
                    $rowData = array_combine($header, $row);
                    if ($rowData !== false) {
                        $data[] = array_map('trim', $rowData);
                    }
                }
            }

        } catch (\Exception $e) {
            throw new \Exception('Error reading Excel file: ' . $e->getMessage());
        }

        return $data;
    }

    public function importSummary(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:10240' // Max 10MB
        ]);

        try {
            $file = $request->file('file');
            if (!$file) {
                return response()->json(['message' => 'No file received'], 400);
            }

            $filePath = $file->getPathname();
            $fileName = $file->getClientOriginalName();
            $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            
            $allowedExtensions = ['csv', 'xlsx', 'xls'];
            if (!in_array($fileExtension, $allowedExtensions)) {
                return response()->json([
                    'message' => 'Unsupported file format. Use CSV or XLSX.',
                    'allowed_extensions' => $allowedExtensions
                ], 400);
            }

            // Lire le fichier selon l'extension
            $data = [];
            if ($fileExtension === 'csv') {
                $data = $this->readCsvFile($filePath);
            } elseif (in_array($fileExtension, ['xlsx', 'xls'])) {
                $data = $this->readExcelFile($filePath);
            }

            if (empty($data)) {
                return response()->json(['message' => 'No data found in file'], 400);
            }

            $importedCount = 0;
            $updatedCount = 0;
            $errors = [];

            foreach ($data as $index => $row) {
                try {
                    // Mapping flexible des en-têtes pour la table source_summaries
                    // Mettre "Website" en premier (Excel utilise souvent des majuscules)
                    $website = $row['Website'] ?? $row['website'] ?? $row['domain'] ?? $row['Domain'] ?? null;
                    
                    // Skip header row if website column contains header names
                    if ($website && (strtolower($website) === 'website' || strtolower($website) === 'domain')) {
                        continue;
                    }
                    
                    $cost = $row['Cost'] ?? $row['cost'] ?? $row['price'] ?? $row['Price'] ?? null;
                    $linkType = $row['Link Type'] ?? $row['link type'] ?? $row['link_type'] ?? $row['linktype'] ?? null;
                    $contactEmail = $row['Contact Email'] ?? $row['contact email'] ?? $row['email'] ?? $row['Email'] ?? null;
                    $spam = $row['Spam'] ?? $row['spam'] ?? $row['spam score'] ?? $row['Spam Score'] ?? null;

                    // Validation: si website est null, on passe à la ligne suivante
                    if (empty($website)) {
                        $errors[] = "Line " . ($index + 2) . ": Website missing - line ignored";
                        continue;
                    }

                    // Conversion des types si possible, sinon null
                    $costValue = is_numeric($cost) ? (float)$cost : null;
                    $spamValue = is_numeric($spam) ? (int)$spam : null;

                    // Normaliser le link_type
                    $normalizedLinkType = $linkType;
                    if ($linkType) {
                        $normalizedLinkType = ucfirst(strtolower($linkType));
                        if (!in_array($normalizedLinkType, ['DoFollow', 'NoFollow'])) {
                            $normalizedLinkType = 'DoFollow'; // Valeur par défaut
                        }
                    }

                    // Utiliser updateOrCreate pour éviter les doublons
                    // La clé unique est le website, pas besoin de vérifier client ou source
                    $summary = SourceSummary::updateOrCreate(
                        ['website' => $website], // Critère de recherche unique
                        [
                            'cost' => $costValue,
                            'link_type' => $normalizedLinkType,
                            'contact_email' => $contactEmail,
                            'spam' => $spamValue,
                            'updated_at' => now()
                        ]
                    );

                    if ($summary->wasRecentlyCreated) {
                        $importedCount++;
                    } else {
                        $updatedCount++;
                    }

                } catch (\Exception $e) {
                    $errors[] = "Line " . ($index + 2) . ": Error - " . $e->getMessage();
                }
            }

            $message = "Import successful: {$importedCount} sites added and {$updatedCount} sites updated.";
            if (!empty($errors)) {
                $message .= " " . count($errors) . " errors encountered.";
            }

            return response()->json([
                'message' => $message,
                'imported_count' => $importedCount,
                'updated_count' => $updatedCount,
                'total_processed' => count($data),
                'errors' => $errors
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error during import: ' . $e->getMessage()], 500);
        }
    }

    public function deleteSummarySource($id)
    {
        try {
            $summary = SourceSummary::findOrFail($id);
            $summary->delete();
            
            return response()->json(['message' => 'Source summary deleted successfully']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Source summary not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error deleting source summary: ' . $e->getMessage()], 500);
        }
    }
}
