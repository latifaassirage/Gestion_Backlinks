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
        $search = $request->get('search', ''); // Terme de recherche
        
        $query = Client::orderBy('created_at', 'desc');
        
        // Ajouter la recherche si un terme est fourni
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('company_name', 'LIKE', '%' . $search . '%')
                  ->orWhere('contact_email', 'LIKE', '%' . $search . '%')
                  ->orWhere('website', 'LIKE', '%' . $search . '%');
            });
        }
        
        $clients = $query->paginate($perPage, ['*'], 'page', $page);

        return $clients;
    }

    public function all()
    {
        return Client::orderBy('created_at', 'desc')->get();
    }

    public function unique()
    {
        // Retourne les clients uniques par email pour éviter les doublons
        return Client::select('id', 'company_name', 'contact_email', 'website', 'city', 'state', 'notes', 'created_at')
            ->distinct('contact_email')
            ->orderBy('created_at', 'desc')
            ->get();
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

        // Vérifier si l'email existe déjà (blocage définitif)
        if (!empty($data['contact_email'])) {
            $existingClient = Client::where('contact_email', $data['contact_email'])->first();
            if ($existingClient) {
                return response()->json([
                    'message' => 'A client with this email already exists.',
                    'errors' => ['contact_email' => ['This email is already registered.']]
                ], 422);
            }
        }

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

        // Vérifier si l'email existe déjà (blocage définitif)
        if (isset($data['contact_email']) && !empty($data['contact_email'])) {
            $existingClient = Client::where('contact_email', $data['contact_email'])
                ->where('id', '!=', $id)
                ->first();
            if ($existingClient) {
                return response()->json([
                    'message' => 'A client with this email already exists.',
                    'errors' => ['contact_email' => ['This email is already registered.']]
                ], 422);
            }
        }

        $client->update($data);
        return response()->json($client);
    }

    public function destroy($id)
    {
        Client::findOrFail($id)->delete();
        return response()->json(['message'=>'Deleted']);
    }
}
