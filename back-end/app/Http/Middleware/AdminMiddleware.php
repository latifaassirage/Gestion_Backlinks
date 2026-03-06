<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Http\Middleware\Middleware as BaseMiddleware;

class AdminMiddleware extends BaseMiddleware
{
    public function handle($request, $next)
    {
        // لا شيء هنا حاليا
        return $next($request);
    }
}