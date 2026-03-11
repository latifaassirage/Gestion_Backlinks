import { useState, useEffect } from "react";
import { getAllClients, createClient } from "../api/clients";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");

  const fetchClients = async () => {
    const res = await getAllClients();
    setClients(res.data);
  };

  const addClient = async (e) => {
    e.preventDefault();
    const res = await createClient({ company_name: company, website });
    setClients([...clients, res.data]);
    setCompany("");
    setWebsite("");
  };

  useEffect(() => { fetchClients(); }, []);

  return (
    <div>
      <h2>Clients</h2>
      <form onSubmit={addClient}>
        <input value={company} onChange={e=>setCompany(e.target.value)} placeholder="Company Name" required />
        <input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="Website" required />
        <button type="submit">Add Client</button>
      </form>

      <ul>
        {clients.map(c => (
          <li key={c.id}>{c.company_name} - {c.website}</li>
        ))}
      </ul>
    </div>
  );
}
