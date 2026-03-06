<?php
require_once __DIR__ . '/back-end/vendor/autoload.php';
$app = require_once __DIR__ . '/back-end/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Models\Backlink;

echo "=== Vérification des données Staff ===\n";

// Vérifier les clients
$clients = Client::all();
echo "📊 Nombre total de clients dans la DB: " . $clients->count() . "\n";
if ($clients->count() > 0) {
    echo "   Premier client: " . $clients->first()->company_name . "\n";
}

// Vérifier les backlinks
$backlinks = Backlink::with(['client', 'sourceSite'])->get();
echo "🔗 Nombre total de backlinks dans la DB: " . $backlinks->count() . "\n";
if ($backlinks->count() > 0) {
    $first = $backlinks->first();
    echo "   Premier backlink: " . $first->target_url . "\n";
    echo "   Status: " . $first->status . "\n";
    echo "   Client: " . ($first->client ? $first->client->company_name : 'N/A') . "\n";
}

// Vérifier les statuts
$liveCount = $backlinks->where('status', 'Live')->count();
$pendingCount = $backlinks->where('status', 'Pending')->count();
$lostCount = $backlinks->where('status', 'Lost')->count();

echo "📈 Répartition des statuts:\n";
echo "   Live: $liveCount\n";
echo "   Pending: $pendingCount\n";
echo "   Lost: $lostCount\n";

// Vérifier ce mois
$currentMonth = date('m');
$currentYear = date('Y');
$monthlyCount = $backlinks->filter(function($backlink) use ($currentMonth, $currentYear) {
    $date = new \DateTime($backlink->date_added ?? $backlink->created_at);
    return $date->format('m') == $currentMonth && $date->format('Y') == $currentYear;
})->count();

echo "📅 Ajouts ce mois: $monthlyCount\n";

echo "\n=== Structure des données ===\n";
if ($backlinks->count() > 0) {
    $first = $backlinks->first();
    echo "Champs disponibles dans Backlink:\n";
    foreach (array_keys($first->toArray()) as $field) {
        echo "   - $field\n";
    }
}
