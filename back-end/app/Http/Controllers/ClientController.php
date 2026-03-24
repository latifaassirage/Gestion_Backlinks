<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 10); // 10 par défaut
        $page = $request->get('page', 1); // Page 1 par défaut
        
        $clients = Client::orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return $clients;
    }

    public function all()
    {
        return Client::orderBy('company_name', 'asc')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'company_name'=>'required|string|max:150',
            'contact_email'=>'nullable|email|max:150',
            'website'=>'required|string|max:150',
            'city'=>'nullable|string|max:100',
            'state'=>'nullable|string|max:100',
            'notes'=>'nullable|string'
        ]);

        $client = Client::create($data);
        return response()->json($client, 201);
    }

    public function show($id)
    {
        return Client::with('backlinks')->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $client = Client::findOrFail($id);
        $data = $request->validate([
            'company_name'=>'sometimes|required|string|max:150',
            'contact_email'=>'sometimes|nullable|email|max:150',
            'website'=>'sometimes|required|string|max:150',
            'city'=>'nullable|string|max:100',
            'state'=>'nullable|string|max:100',
            'notes'=>'nullable|string'
        ]);
        $client->update($data);
        return response()->json($client);
    }

    public function destroy($id)
    {
        Client::findOrFail($id)->delete();
        return response()->json(['message'=>'Deleted']);
    }
}
