<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

// Route pour la page de login
Route::get('/login', function () {
    return view('app'); // Vue principale de l'application React
})->name('login');

// Route pour le Reset Password - retourne la vue React
Route::get('/password/reset', function () {
    return view('app'); // Vue principale de l'application React
})->name('password.reset');

// Route pour le Reset Password avec token dans l'URL
Route::get('/password/reset/{token}', function ($token) {
    return view('app'); // Vue principale de l'application React
})->name('password.reset.token');

// Route catch-all pour les autres URLs - retourne la vue React
Route::get('/{path?}', function () {
    return view('app'); // Vue principale de l'application React
})->where('path', '.*');
