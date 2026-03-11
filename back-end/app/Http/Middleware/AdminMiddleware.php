<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminMiddleware 
{
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();
        
        // Check if user is authenticated
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        
        // Only allow admin to access admin routes
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Access denied. Admin role required.'], 403);
        }
        
        return $next($request);
    }
}