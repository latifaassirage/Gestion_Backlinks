<?php
require_once __DIR__ . '/back-end/vendor/autoload.php';
$app = require_once __DIR__ . '/back-end/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Backlink;

echo "=== Structure Backlink ===\n";

$backlinks = Backlink::with(['client', 'sourceSite'])->get();

if ($backlinks->count() > 0) {
    $first = $backlinks->first();
    echo "Premier backlink:\n";
    echo "ID: " . $first->id . "\n";
    echo "Client: " . ($first->client ? $first->client->company_name : 'N/A') . "\n";
    echo "Source Site ID: " . $first->source_site_id . "\n";
    echo "Source Site (relation): " . ($first->sourceSite ? $first->sourceSite->domain : 'N/A') . "\n";
    echo "Type: " . $first->type . "\n";
    echo "Target URL: " . $first->target_url . "\n";
    echo "Anchor Text: " . $first->anchor_text . "\n";
    echo "Status: " . $first->status . "\n";
    echo "Cost: " . $first->cost . "\n";
    
    echo "\nStructure complète de l'objet:\n";
    print_r($first->toArray());
    
    echo "\nSource Site relation:\n";
    if ($first->sourceSite) {
        print_r($first->sourceSite->toArray());
    }
} else {
    echo "Aucun backlink trouvé\n";
}
