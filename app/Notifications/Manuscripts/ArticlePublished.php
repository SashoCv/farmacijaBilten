<?php

namespace App\Notifications\Manuscripts;

use App\Mail\TemplatedMail;
use App\Models\Article;
use App\Models\Manuscript;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** The author's article is online. */
class ArticlePublished extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    public function __construct(public Manuscript $manuscript, public Article $article)
    {
        $this->afterCommit();
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->article->loadMissing('issue');

        return TemplatedMail::make('article_published', [
            'name' => $notifiable->name ?? '',
            'title' => $this->article->title,
            'reference' => $this->manuscript->reference,
            'issue' => $this->article->issue->label(),
            'doi' => $this->article->doi ? 'DOI: https://doi.org/'.$this->article->doi : '',
        ], route('articles.show', [$this->article->issue, $this->article->number]));
    }
}
