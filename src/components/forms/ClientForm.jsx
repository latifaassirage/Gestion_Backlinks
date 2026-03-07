import React, { useState } from 'react';
import api from '../../api/api';

const ClientForm = () => {
    const [companyName, setCompanyName] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        api.post('/clients', { company_name: companyName })
           .then(res => alert(res.data.message))
           .catch(err => console.error(err));
    };

    return (
        <form onSubmit={handleSubmit}>
            <input 
                type="text" 
                placeholder="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
            />
            <button type="submit">Add Client</button>
        </form>
    );
};

export default ClientForm;