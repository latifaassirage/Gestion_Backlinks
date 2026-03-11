<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Http\Middleware\Middleware as BaseMiddleware;

class StaffMiddleware 
{
    public function handle($request, $next)
    {
      
        return $next($request);
    }
}