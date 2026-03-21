<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Client;
use App\Models\SourceSite;
use App\Models\Backlink;
use App\Models\BacklinkType;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
        ]);

        // Créer les types de backlinks
        BacklinkType::create(['name' => 'Guest post']);
        BacklinkType::create(['name' => 'Directory']);
        BacklinkType::create(['name' => 'Profil']);
        BacklinkType::create(['name' => 'Comment']);
        BacklinkType::create(['name' => 'Other']);

        $c1 = Client::create(['company_name' => 'Luxury Limo', 'contact_email' => 'contact@luxurylimo.com', 'website' => 'luxurylimo.com', 'city' => 'Los Angeles', 'state' => 'CA', 'notes' => 'Wedding limo']);
        $c2 = Client::create(['company_name' => 'Nyc limo service', 'contact_email' => 'info@nyclimoservice.com', 'website' => 'nyclimoservice.com', 'city' => 'New York', 'state' => 'NY', 'notes' => 'Airport limo']);
        $c3 = Client::create(['company_name' => 'Royal jet Limo', 'contact_email' => 'booking@royaljetlimo.com', 'website' => 'royaljetlimo.com', 'city' => 'London', 'state' => 'Greater London', 'notes' => 'Private Jet Transfers']);
        $c4 = Client::create(['company_name' => 'Empire Chauffeurs', 'contact_email' => 'reservations@empirechauffeurs.ae', 'website' => 'empirechauffeurs.ae', 'city' => 'Dubai', 'state' => 'Dubai', 'notes' => 'Royal Wedding Cars']);
        $c5 = Client::create(['company_name' => 'Blacklane VIP', 'contact_email' => 'vip@blacklane.com', 'website' => 'blacklane.com', 'city' => 'Berlin', 'state' => 'Berlin', 'notes' => 'Executive Chauffeur']);
        $c6 = Client::create(['company_name' => 'Carey International', 'contact_email' => 'service@carey.com', 'website' => 'carey.com', 'city' => 'Washington', 'state' => 'DC', 'notes' => 'Diplomatic transport']);

        $s1 = SourceSite::create(['domain' => 'Medium.com', 'quality_score' => 4, 'dr' => 95, 'traffic_estimated' => 150000, 'spam_score' => 15, 'notes' => 'High authority blog platform']);
        $s2 = SourceSite::create(['domain' => 'bbb.org', 'quality_score' => 2, 'dr' => 93, 'traffic_estimated' => 120000, 'spam_score' => 5, 'notes' => 'Trusted business directory']);
        $s3 = SourceSite::create(['domain' => 'bloomberg.com', 'quality_score' => 5, 'dr' => 97, 'traffic_estimated' => 25000, 'spam_score' => 8, 'notes' => 'Premium financial news source']);
        $s4 = SourceSite::create(['domain' => 'forbes.com', 'quality_score' => 5, 'dr' => 95, 'traffic_estimated' => 1000000, 'spam_score' => 12, 'notes' => null]);
        $s5 = SourceSite::create(['domain' => 'tripadvisor.com', 'quality_score' => 4, 'dr' => 92, 'traffic_estimated' => 500000, 'spam_score' => 35, 'notes' => null]);
        $s6 = SourceSite::create(['domain' => 'businessinsider.com', 'quality_score' => 4, 'dr' => 91, 'traffic_estimated' => 800000, 'spam_score' => 45, 'notes' => null]);

        Backlink::create([
            'client_id' => $c1->id, 'source_site_id' => $s1->id, 'type' => 'Guest Post', 'link_type' => 'DoFollow',
            'target_url' => 'https://luxurylimo.com/wedding', 'anchor_text' => 'Limo for wedding LA', 
            'placement_url' => 'https://medium.com/travel/best-limo', 'status' => 'Live', 
            'date_added' => '2026-03-08', 'cost' => 0
        ]);

        Backlink::create([
            'client_id' => $c2->id, 'source_site_id' => $s2->id, 'type' => 'Directory', 'link_type' => 'NoFollow',
            'target_url' => 'https://nyclimoservice.com', 'anchor_text' => 'NYC Limo Service', 
            'placement_url' => 'https://bbb.org/nyc-profile', 'status' => 'Pending', 
            'date_added' => '2026-03-08', 'cost' => 90
        ]);

        Backlink::create([
            'client_id' => $c3->id, 'source_site_id' => $s3->id, 'type' => 'Guest Post', 'link_type' => 'DoFollow',
            'target_url' => 'https://royaljetlimo.com', 'anchor_text' => 'Private Jet London', 
            'placement_url' => 'https://bloomberg.com/luxury-news', 'status' => 'Live', 
            'date_added' => '2026-03-08', 'cost' => 178
        ]);

        Backlink::create([
            'client_id' => $c4->id, 'source_site_id' => $s4->id, 'type' => 'Guest Post', 'link_type' => 'DoFollow',
            'target_url' => 'https://empirechauffeurs.ae', 'anchor_text' => 'Luxury Cars Dubai', 
            'placement_url' => 'https://forbes.com/business/dubai', 'status' => 'Live', 
            'date_added' => now(), 'cost' => 120
        ]);

        Backlink::create([
            'client_id' => $c5->id, 'source_site_id' => $s5->id, 'type' => 'Guest Post', 'link_type' => 'NoFollow',
            'target_url' => 'https://blacklane.com/vip', 'anchor_text' => 'Berlin Chauffeur', 
            'placement_url' => 'https://tripadvisor.com/travel-tips', 'status' => 'Pending', 
            'date_added' => now(), 'cost' => 0
        ]);

        Backlink::create([
            'client_id' => $c6->id, 'source_site_id' => $s6->id, 'type' => 'Guest Post', 'link_type' => 'NoFollow',
            'target_url' => 'https://carey.com', 'anchor_text' => 'Diplomatic Transport', 
            'placement_url' => 'https://businessinsider.com/transport-guide', 'status' => 'Live', 
            'date_added' => now(), 'cost' => 0
        ]);
    }
}