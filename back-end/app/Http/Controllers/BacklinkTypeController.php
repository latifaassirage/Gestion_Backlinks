<?php

namespace App\Http\Controllers;

use App\Models\BacklinkType;
use Illuminate\Http\Request;

class BacklinkTypeController extends Controller
{
    public function index()
    {
        return response()->json(BacklinkType::all());
    }

    public function store(Request $request)
    {
        $request->validate(['name' => 'required|unique:backlink_types,name']);
        $type = \App\Models\BacklinkType::create(['name' => $request->name]);
        return response()->json($type);
    }

    public function destroy($id)
    {
        $type = BacklinkType::findOrFail($id);
        
        // Vérifier si des backlinks utilisent ce type
        $backlinksCount = \App\Models\Backlink::where('type', $type->name)->count();
        
        if ($backlinksCount > 0) {
            return response()->json([
                'message' => "Cannot delete '{$type->name}' because it is used by {$backlinksCount} backlink(s)."
            ], 422);
        }
        
        $type->delete();
        
        return response()->json([
            'message' => 'Backlink type deleted successfully'
        ]);
    }
}