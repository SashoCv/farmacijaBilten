import type { Editor } from '@tiptap/react';
import { Omega } from 'lucide-react';
import { useRef } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useT } from '@/lib/i18n';
import { toolClass } from './tool-button';

/** Symbol palette from plan.md §6.3, plus a few common extras. */
const GROUPS: { label: string; symbols: [string, string][] }[] = [
    {
        label: 'Greek',
        symbols: [
            ['α', 'alpha'],
            ['β', 'beta'],
            ['γ', 'gamma'],
            ['δ', 'delta'],
            ['Δ', 'capital delta'],
            ['ε', 'epsilon'],
            ['θ', 'theta'],
            ['κ', 'kappa'],
            ['λ', 'lambda'],
            ['µ', 'micro sign (units: µg, µL)'],
            ['μ', 'Greek mu'],
            ['π', 'pi'],
            ['ρ', 'rho'],
            ['σ', 'sigma'],
            ['Σ', 'capital sigma'],
            ['τ', 'tau'],
            ['φ', 'phi'],
            ['χ', 'chi'],
            ['ω', 'omega'],
            ['Ω', 'capital omega'],
        ],
    },
    {
        label: 'Operators and signs',
        symbols: [
            ['±', 'plus-minus'],
            ['×', 'multiplication'],
            ['÷', 'division'],
            ['−', 'minus sign'],
            ['–', 'en dash (ranges)'],
            ['≤', 'less than or equal'],
            ['≥', 'greater than or equal'],
            ['≈', 'approximately'],
            ['≠', 'not equal'],
            ['~', 'tilde'],
            ['→', 'right arrow'],
            ['⇌', 'equilibrium'],
            ['√', 'square root'],
            ['∑', 'summation'],
            ['·', 'middle dot'],
            ['‰', 'per mille'],
            ['°', 'degree'],
            ['′', 'prime'],
            ['″', 'double prime'],
        ],
    },
    {
        label: 'Quotation marks',
        symbols: [
            ['’', 'apostrophe'],
            ['“', 'left double quote'],
            ['”', 'right double quote'],
            ['„', 'low double quote (Macedonian)'],
        ],
    },
];

export function SymbolPicker({ editor }: { editor: Editor | null }) {
    const { t } = useT();
    const inserted = useRef(false);

    return (
        <DropdownMenu
            onOpenChange={(open) => {
                if (open) {
                    inserted.current = false;
                }
            }}
        >
            <DropdownMenuTrigger
                className={toolClass}
                disabled={editor === null}
                aria-label={t('Insert symbol')}
                title={t('Insert symbol')}
            >
                <Omega aria-hidden="true" className="size-4" />
                <span className="text-xs">{t('Symbol')}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="w-72"
                onCloseAutoFocus={(event) => {
                    // After an insert, typing continues in the editor; after
                    // Escape, focus returns to the button as usual.
                    if (inserted.current && editor) {
                        event.preventDefault();
                        editor.commands.focus();
                    }
                }}
            >
                {GROUPS.map((group) => (
                    <DropdownMenuGroup key={group.label}>
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            {t(group.label)}
                        </DropdownMenuLabel>
                        <div className="grid grid-cols-8 gap-0.5 px-1 pb-1">
                            {group.symbols.map(([symbol, name]) => (
                                <DropdownMenuItem
                                    key={symbol}
                                    aria-label={t(name)}
                                    title={t(name)}
                                    className="justify-center px-0 font-serif text-base"
                                    onSelect={() => {
                                        inserted.current = true;
                                        editor
                                            ?.chain()
                                            .focus()
                                            .insertContent(symbol)
                                            .run();
                                    }}
                                >
                                    {symbol}
                                </DropdownMenuItem>
                            ))}
                        </div>
                    </DropdownMenuGroup>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
