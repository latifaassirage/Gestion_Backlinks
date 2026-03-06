<?php

namespace App\Http\Controllers;

use App\Models\Backlink;
use Illuminate\Http\Request;

class BacklinkController extends Controller
{
    public function index()
    {
        return Backlink::with(['client','sourceSite'])->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'client_id'=>'required|exists:clients,id',
            'source_site_id'=>'required|exists:source_sites,id',
            'type'=>'required|in:Guest Post,Directory,Profile,Comment,Other',
            'target_url'=>'required|url',
            'anchor_text'=>'nullable|string',
            'placement_url'=>'nullable|url',
            'date_added'=>'required|date',
            'status'=>'nullable|in:Pending,Live,Lost',
            'cost'=>'nullable|numeric|min:0',
        ]);

        // Vérification doublon
        $exists = Backlink::where('client_id',$data['client_id'])
                          ->where('source_site_id',$data['source_site_id'])
                          ->first();
        if($exists){
            return response()->json(['message'=>'Doublon détecté'], 409);
        }

        $backlink = Backlink::create($data);
        return response()->json($backlink, 201);
    }

    public function show($id)
    {
        return Backlink::with(['client','sourceSite'])->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $backlink = Backlink::findOrFail($id);
        $data = $request->validate([
            'client_id'=>'sometimes|required|exists:clients,id',
            'source_site_id'=>'sometimes|required|exists:source_sites,id',
            'type'=>'sometimes|required|in:Guest Post,Directory,Profile,Comment,Other',
            'target_url'=>'sometimes|required|url',
            'anchor_text'=>'nullable|string',
            'placement_url'=>'nullable|url',
            'date_added'=>'sometimes|required|date',
            'status'=>'nullable|in:Pending,Live,Lost',
            'cost'=>'nullable|numeric|min:0',
        ]);
        $backlink->update($data);
        return response()->json($backlink);
    }

    public function destroy($id)
    {
        Backlink::findOrFail($id)->delete();
        return response()->json(['message'=>'Deleted']);
    }
}