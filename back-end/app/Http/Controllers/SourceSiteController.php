<?php

namespace App\Http\Controllers;

use App\Models\SourceSite;
use Illuminate\Http\Request;

class SourceSiteController extends Controller
{
    public function index()
    {
        return SourceSite::all();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'domain'=>'required|string|unique:source_sites,domain',
            'quality_score'=>'required|integer|min:1|max:5',
            'dr'=>'nullable|integer',
            'estimated_traffic'=>'nullable|string',
            'notes'=>'nullable|string',
        ]);

        $source = SourceSite::create($data);
        return response()->json($source, 201);
    }

    public function show($id)
    {
        return SourceSite::with('backlinks')->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $source = SourceSite::findOrFail($id);
        $data = $request->validate([
            'domain'=>'sometimes|required|string|unique:source_sites,domain,'.$id,
            'quality_score'=>'sometimes|required|integer|min:1|max:5',
            'dr'=>'nullable|integer',
            'estimated_traffic'=>'nullable|string',
            'notes'=>'nullable|string',
        ]);
        $source->update($data);
        return response()->json($source);
    }

    public function destroy($id)
    {
        SourceSite::findOrFail($id)->delete();
        return response()->json(['message'=>'Deleted']);
    }
}
