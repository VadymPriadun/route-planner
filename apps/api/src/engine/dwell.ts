export type VisitMode = 'OUTSIDE' | 'MAIN' | 'ALL';

export interface DwellInput {
    name: string;
    category: string;
    subcategory: string | null;
    metadata: Record<string, string> | null;
}

export interface Dwell {
    outsideMin: number;
    insideMin: number;
    enterable: boolean;
    main: boolean;
    queueMin: number;
}

const has = (n: string, words: string[]): boolean => words.some((w) => n.includes(w));

// Основні об'єкти, куди туристи заходять всередину
const MAJOR = [
    'uffizi', 'accademia', 'bargello', 'palazzo pitti', 'palazzo vecchio',
    'cattedrale di santa maria del fiore', 'campanile di giotto', 'battistero',
    'cappelle medicee', 'basilica di santa croce', 'basilica di san lorenzo',
    'basilica di santa maria novella', 'san miniato al monte', 'orsanmichele',
];

// Час всередині для окремих об'єктів (хв)
const INSIDE_OVERRIDE: [string, number][] = [
    ['uffizi', 120], ['palazzo pitti', 120], ['bargello', 90], ['accademia', 60],
    ['palazzo vecchio', 45], ['cattedrale di santa maria del fiore', 45],
    ['campanile di giotto', 45], ['battistero', 20], ['cappelle medicee', 45],
    ['orsanmichele', 20],
];

// Об'єкти, де зазвичай черга (+40 хв, лише якщо заходимо всередину)
const QUEUE = ['uffizi', 'cattedrale di santa maria del fiore', 'campanile di giotto', 'accademia'];

export function classifyDwell(p: DwellInput): Dwell {
    const n = p.name.toLowerCase();
    const wd = Boolean(p.metadata?.wikidata);
    const major = has(n, MAJOR);
    const override = INSIDE_OVERRIDE.find(([k]) => n.includes(k))?.[1];
    const queueMin = has(n, QUEUE) ? 40 : 0;

    // Музеї й галереї
    if (p.category === 'MUSEUM' || p.category === 'ART') {
        const inside = override ?? (p.category === 'ART' ? 60 : major ? 90 : 75);
        return { outsideMin: 15, insideMin: inside, enterable: true, main: major || wd, queueMin };
    }
    // Назви, які визначають тип незалежно від категорії OSM
    if (has(n, ['ponte '])) return { outsideMin: 15, insideMin: 15, enterable: false, main: false, queueMin: 0 };
    if (p.category !== 'PARK' && has(n, ['piazza ', 'piazzale', 'giardino', 'parco '])) {
        return { outsideMin: 20, insideMin: 20, enterable: false, main: false, queueMin: 0 };
    }
    
    if (p.subcategory === 'city_gate' || n.startsWith('porta ') || has(n, ['arco '])) {
        return { outsideMin: 5, insideMin: 5, enterable: false, main: false, queueMin: 0 };
    }
    if (p.category === 'CHURCH') {
        return { outsideMin: 15, insideMin: override ?? (major ? 45 : 15), enterable: true, main: major, queueMin };
    }
    if (p.category === 'ATTRACTION') {
        if (has(n, ['campanile', 'torre', 'cupola'])) {
            return { outsideMin: 10, insideMin: override ?? 45, enterable: true, main: true, queueMin };
        }
        if (major) return { outsideMin: 15, insideMin: override ?? 45, enterable: true, main: true, queueMin };
        return { outsideMin: 15, insideMin: 15, enterable: false, main: false, queueMin: 0 };
    }
    if (p.category === 'HISTORIC') {
        if (major) return { outsideMin: 15, insideMin: override ?? 90, enterable: true, main: true, queueMin };
        if (p.subcategory === 'castle' || p.subcategory === 'fort') {
            return { outsideMin: 15, insideMin: 45, enterable: true, main: false, queueMin: 0 };
        }
        if (has(n, ['torre'])) return { outsideMin: 10, insideMin: 10, enterable: false, main: false, queueMin: 0 };
        if (p.subcategory === 'ruins' || p.subcategory === 'archaeological_site') {
            return { outsideMin: 15, insideMin: 15, enterable: false, main: false, queueMin: 0 };
        }
        // Звичайні палаццо, монументи: лише зовнішній огляд
        return { outsideMin: 10, insideMin: 10, enterable: false, main: false, queueMin: 0 };
    }
    if (p.category === 'PARK') return { outsideMin: 20, insideMin: 20, enterable: false, main: false, queueMin: 0 };
    if (p.category === 'VIEWPOINT') return { outsideMin: 15, insideMin: 15, enterable: false, main: false, queueMin: 0 };
    return { outsideMin: 15, insideMin: 15, enterable: false, main: false, queueMin: 0 };
}

export function visitMinutes(d: Dwell, mode: VisitMode, queues: boolean): { minutes: number; inside: boolean } {
    const inside = d.enterable && (mode === 'ALL' || (mode === 'MAIN' && d.main));
    return { inside, minutes: inside ? d.insideMin + (queues ? d.queueMin : 0) : d.outsideMin };
}