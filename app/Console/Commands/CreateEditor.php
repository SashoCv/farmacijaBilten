<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * Public registration is disabled, so editors' accounts for the submissions
 * list (/admin/submissions) are created here. Running it again for the same
 * address renames the user and issues a new password.
 */
#[Signature('journal:create-editor {email : The editor\'s e-mail address (login)} {name : Full name, in quotes}')]
#[Description('Create or update an editor account and print a new random password once')]
class CreateEditor extends Command
{
    public function handle(): int
    {
        $email = Str::lower(trim((string) $this->argument('email')));
        $name = trim((string) $this->argument('name'));

        $validator = Validator::make(compact('email', 'name'), [
            'email' => ['required', 'email:rfc', 'max:190'],
            'name' => ['required', 'string', 'max:120'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->components->error($error);
            }

            return self::FAILURE;
        }

        $password = Str::password(20, symbols: false);
        $user = User::where('email', $email)->first();
        $existed = $user !== null;

        $user ??= new User(['email' => $email]);
        $user->forceFill([
            'name' => $name,
            'password' => $password,
            // Accounts are created by an administrator, so the address counts as verified.
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        $this->components->info($existed
            ? "Updated {$email} and issued a new password."
            : "Created the editor account {$email}.");

        $this->newLine();
        $this->line("  Password: <options=bold>{$password}</>");
        $this->newLine();
        $this->components->warn('This password is shown only once. Ask the editor to change it under Settings → Security after signing in at /login.');

        return self::SUCCESS;
    }
}
