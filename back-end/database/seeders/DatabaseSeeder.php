<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Admin',
            'email' => 'admin@agency.com',
            'password' => Hash::make('Admin123!'),
            'role' => 'admin',
        ]);

        $this->call(StaffSeeder::class);
    }
}
