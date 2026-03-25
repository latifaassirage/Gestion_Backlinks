<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Staff;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
   public function login(Request $request)
{
    $request->validate([
        'email' => 'required|email',
        'password' => 'required'
    ]);

    $user = User::where('email', $request->email)->first();

    if (!$user || !Hash::check($request->password, $user->password)) {
        return response()->json([
            'message' => 'Invalid credentials'
        ], 401);
    }

    $token = $user->createToken('auth_token')->plainTextToken;

    return response()->json([
        'user' => $user,
        'token' => $token
    ]);
}

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message'=>'Logged out']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        // Recherche multi-table: d'abord User, puis Staff
        $user = User::where('email', $request->email)->first();
        $userType = 'User';
        
        if (!$user) {
            // Si pas trouvé dans User, chercher dans Staff
            $user = Staff::where('email', $request->email)->first();
            $userType = 'Staff';
        }

        if (!$user) {
            return response()->json([
                'message' => 'Aucun utilisateur trouvé avec cette adresse email'
            ], 404);
        }

        // Générer un token de réinitialisation
        $token = bin2hex(random_bytes(32));
        $expiry = now()->addHours(1); // Token valide 1 heure

        // Stocker le token (vous pourriez utiliser une table password_resets)
        // Pour simplifier, on utilise directement une notification par email
        // Dans un vrai projet, vous enverriez un email avec un lien de réinitialisation
        
        // Simulation d'envoi d'email - dans la vraie vie, utilisez Mail::send()
        \Log::info("Password reset token for {$userType} {$user->email}: {$token}");
        
        // Générer l'URL de reset
        $resetUrl = url('/password/reset/' . $token);
        \Log::info("Reset URL: {$resetUrl}");
        
        // Pour cette démo, on retourne juste un message de succès
        // En production, vous enverriez un email avec le lien: 
        // https://votre-app.com/reset-password?token={$token}&email={$user->email}
        
        return response()->json([
            'message' => 'Un email de réinitialisation a été envoyé à votre adresse email.',
            'debug_token' => app()->environment('local') ? $token : null, // Debug uniquement en local
            'reset_url' => app()->environment('local') ? $resetUrl : null, // Debug URL en local
            'user_type' => app()->environment('local') ? $userType : null // Debug user type en local
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed'
        ]);

        // Pour cette démo, on simule une table password_resets
        // Dans un vrai projet, vous auriez une vraie table password_resets
        
        // Simulation de validation du token dans password_resets
        $token = $request->token;
        $email = $request->email;
        
        \Log::info("Reset password attempt with token: {$token} for email: {$email}");
        
        // Pour cette démo, on considère que le token est valide s'il fait au moins 20 caractères
        // En production, vous vérifieriez dans la table password_resets:
        // - Token existe
        // - Token n'a pas expiré (généralement 1 heure)
        // - Token correspond à l'email
        
        if (strlen($token) < 20) {
            return response()->json([
                'message' => 'Invalid reset token'
            ], 400);
        }
        
        // Recherche multi-table: d'abord User, puis Staff
        $user = User::where('email', $email)->first();
        $userType = 'User';
        
        if (!$user) {
            // Si pas trouvé dans User, chercher dans Staff
            $user = Staff::where('email', $email)->first();
            $userType = 'Staff';
        }
        
        if (!$user) {
            return response()->json([
                'message' => 'User not found with this email address'
            ], 404);
        }
        
        \Log::info("User found in {$userType} table: {$user->email}");
        
        // Hacher le nouveau mot de passe et le sauvegarder
        $user->update([
            'password' => Hash::make($request->password)
        ]);
        
        \Log::info("Password reset successful for {$userType}: {$user->email}");
        
        return response()->json([
            'message' => 'Password has been reset successfully'
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$user->id,
        ]);

        
        if ($request->filled('name')) {
            $user->name = $request->name;
        }

       
        if ($request->filled('email')) {
            $user->email = $request->email;
        }

               if ($request->filled('current_password') && $request->filled('new_password')) {
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'message' => 'Current password is incorrect'
                ], 422);
            }

            $user->password = Hash::make($request->new_password);
        }

               if ($user->role === 'staff') {
            if ($request->filled('position')) {
                $user->position = $request->position;
            }
            if ($request->filled('department')) {
                $user->department = $request->department;
            }
        }

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user
        ]);
    }
}
