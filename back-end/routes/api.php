<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\SourceSiteController;
use App\Http\Controllers\BacklinkController;
use App\Http\Controllers\ReportController;

// Auth
Route::post('/login',[AuthController::class,'login']);
Route::post('/logout',[AuthController::class,'logout'])->middleware('auth:sanctum');
Route::get('/me',[AuthController::class,'me'])->middleware('auth:sanctum');

// Clients
Route::middleware('auth:sanctum')->group(function(){
    Route::apiResource('clients', ClientController::class);
    Route::apiResource('sources', SourceSiteController::class);
    Route::apiResource('backlinks', BacklinkController::class);
    Route::apiResource('reports', ReportController::class);
});
