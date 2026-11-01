<?php

namespace App\Console\Commands;

use App\Journal\Search\ScopeTopics;
use App\Journal\Search\SearchIndex;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Rebuilds articles.search_text (see App\Journal\Search\SearchIndex). The
 * importer runs it at the end: Artisan::call('journal:index-search').
 */
#[Signature('journal:index-search {--missing : Only index articles that have no search text yet}')]
#[Description('Build the folded (Latin/Cyrillic, diacritic-insensitive) search index for articles')]
class IndexSearch extends Command
{
    public function handle(): int
    {
        $count = SearchIndex::rebuild(onlyMissing: (bool) $this->option('missing'));
        ScopeTopics::flush();

        $this->info("Indexed {$count} ".str('article')->plural($count).'.');

        return self::SUCCESS;
    }
}
