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

// Profile
Route::put('/profile',[AuthController::class,'updateProfile'])->middleware('auth:sanctum');

// Read-only routes for Staff and Admin (dashboard stats)
Route::middleware(['auth:sanctum', 'staff'])->group(function(){
    Route::get('/clients', [ClientController::class, 'index']);
    Route::get('/sources', [SourceSiteController::class, 'index']);
});

// Admin only routes
Route::middleware(['auth:sanctum', 'admin'])->group(function(){
    Route::apiResource('clients', ClientController::class)->except('index');
    Route::apiResource('sources', SourceSiteController::class)->except('index');
    
    // Report generation routes
    Route::post('/reports/pdf/{clientId?}', [ReportController::class, 'generatePdf']);
    Route::post('/reports/excel/{clientId?}', [ReportController::class, 'generateExcel']);
});

// Staff and Admin routes (backlinks management)
Route::middleware(['auth:sanctum', 'staff'])->group(function(){
    Route::apiResource('backlinks', BacklinkController::class);
});
