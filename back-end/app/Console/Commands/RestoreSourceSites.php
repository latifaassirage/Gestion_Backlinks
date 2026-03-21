<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\SourceSite;

class RestoreSourceSites extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'restore:source-sites';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Restaurer les source sites à partir des backlinks existants';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('=== RESTAURATION DES SOURCE WEBSITES ===');
        $this->line('');
        
        // Vider la table source_sites existante
        $this->info('1. Vidage de la table source_sites...');
        
        // Désactiver les contraintes de clé étrangère
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        
        // Supprimer les enregistrements existants
        DB::table('source_sites')->delete();
        
        // Réactiver les contraintes
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
        
        $this->info('   ✓ Table source_sites vidée');
        $this->line('');
        
        // Récupérer tous les domaines uniques depuis les backlinks
        $this->info('2. Récupération des domaines uniques depuis les backlinks...');
        
        $backlinks = DB::table('backlinks')
            ->select([
                'target_url',
                'cost',
                'client_id'
            ])
            ->whereNotNull('target_url')
            ->get();
        
        $this->info('   ✓ ' . $backlinks->count() . ' backlinks trouvés');
        $this->line('');
        
        // Extraire les domaines uniques
        $uniqueDomains = [];
        $sourceSitesToCreate = [];
        
        foreach ($backlinks as $backlink) {
            $domain = parse_url($backlink->target_url, PHP_URL_HOST);
            if ($domain && !in_array($domain, $uniqueDomains)) {
                $uniqueDomains[] = $domain;
                
                // Récupérer le premier backlink pour ce domaine
                $firstBacklink = DB::table('backlinks')
                    ->where('target_url', 'like', '%' . $domain . '%')
                    ->first();
                
                // Récupérer l'email du client associé
                $clientEmail = null;
                if ($firstBacklink && $firstBacklink->client_id) {
                    $client = DB::table('clients')
                        ->where('id', $firstBacklink->client_id)
                        ->first();
                    $clientEmail = $client ? $client->contact_email : null;
                }
                
                $sourceSitesToCreate[] = [
                    'website_url' => $firstBacklink->target_url ?? "https://{$domain}",
                    'type' => 'DoFollow',
                    'spam_score' => 0,
                    'cost' => $firstBacklink->cost ?? 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }
        
        $this->info('   ✓ ' . count($uniqueDomains) . ' domaines uniques identifiés');
        $this->line('');
        
        // Insérer les source sites
        if (!empty($sourceSitesToCreate)) {
            $this->info('3. Insertion des source sites dans la base de données...');
            
            $chunks = array_chunk($sourceSitesToCreate, 100);
            
            foreach ($chunks as $index => $chunk) {
                DB::table('source_sites')->insert($chunk);
                $this->info('   ✓ Lot ' . ($index + 1) . ' inséré (' . count($chunk) . ' sites)');
            }
            
            $this->line('');
            $this->info('   ✓ Total: ' . count($sourceSitesToCreate) . ' source sites créés');
            $this->line('');
        } else {
            $this->warn('   ⚠️ Aucun site source à créer');
            $this->line('');
        }
        
        // Afficher le résumé
        $this->info('=== RÉSUMÉ DE LA RESTAURATION ===');
        $this->info('• Domaines uniques: ' . count($uniqueDomains));
        $this->info('• Source sites créés: ' . count($sourceSitesToCreate));
        $this->info('• Emails de contact récupérés: ' . count(array_filter($sourceSitesToCreate, fn($s) => $s['contact_email'])));
        $this->info('• Coûts récupérés: ' . count(array_filter($sourceSitesToCreate, fn($s) => $s['cost'] > 0)));
        $this->line('');
        $this->info('✅ Restauration terminée avec succès !');
    }
}
