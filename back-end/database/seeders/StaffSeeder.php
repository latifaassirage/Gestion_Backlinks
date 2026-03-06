<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class StaffSeeder extends Seeder
{
    public function run()
    {
        User::create([
            'name' => 'Staff User',
            'email' => 'staff@agency.com',
            'password' => Hash::make('Staff123!'),
            'role' => 'staff',
        ]);
    }
}
