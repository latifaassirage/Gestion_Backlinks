<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // كريي الـ Admin إيلا ماكانش موجود
        User::firstOrCreate(
            ['email' => 'admin@agency.com'],
            [
                'name' => 'Admin',
                'password' => Hash::make('Admin123!'),
                'role' => 'admin',
            ]
        );

       
        User::firstOrCreate(
            ['email' => 'staff@agency.com'],
            [
                'name' => 'Staff SEO',
                'password' => Hash::make('Staff123!'),
                'role' => 'staff',
            ]
        );
    }
}