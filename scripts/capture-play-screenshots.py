#!/usr/bin/env python3
"""Capture real Mon Budget Familial screens with local demo data.

The script drives the actual application with Chromium/Playwright. It never creates a
cloud account and only injects fictional demo data into localStorage.
"""
import argparse
import json
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
NOW = '2026-09-05T09:00:00.000Z'


def demo_ledger(language: str):
    if language == 'en':
        return {
            'settings': {'savings_rate_pct': 15, 'warn_threshold_pct': 80, 'household_name': 'Demo Family', 'members': ['Me'], 'currency': 'USD', 'updated_at': NOW},
            'incomes': [{'id': 'i1', 'date': '2026-09-01', 'amount': 3500, 'source': 'Salary', 'method': 'banque', 'recurring': True, 'note': '', 'updated_at': NOW, 'deleted_at': None}],
            'envelopes': [
                {'id': 'e1', 'name': 'Food', 'planned': 650, 'position': 0, 'updated_at': NOW, 'deleted_at': None},
                {'id': 'e2', 'name': 'Transport', 'planned': 320, 'position': 1, 'updated_at': NOW, 'deleted_at': None},
                {'id': 'e3', 'name': 'Leisure', 'planned': 180, 'position': 2, 'updated_at': NOW, 'deleted_at': None},
            ],
            'budget_overrides': [],
            'expenses': [
                {'id': 'x1', 'date': '2026-09-02', 'amount': 145, 'envelope_id': 'e1', 'method': 'wave', 'description': 'Groceries', 'member': 'Me', 'charge_id': None, 'override_reason': '', 'updated_at': NOW, 'deleted_at': None},
                {'id': 'x2', 'date': '2026-09-03', 'amount': 72, 'envelope_id': 'e2', 'method': 'especes', 'description': 'Transport', 'member': 'Me', 'charge_id': None, 'override_reason': '', 'updated_at': NOW, 'deleted_at': None},
                {'id': 'x3', 'date': '2026-09-04', 'amount': 58, 'envelope_id': 'e1', 'method': 'orange_money', 'description': 'Market', 'member': 'Me', 'charge_id': None, 'override_reason': '', 'updated_at': NOW, 'deleted_at': None},
            ],
            'charges': [
                {'id': 'c1', 'label': 'Rent', 'amount': 950, 'due_day': 5, 'frequency': 'mensuelle', 'start_month': '2026-01', 'active': True, 'updated_at': NOW, 'deleted_at': None},
                {'id': 'c2', 'label': 'Electricity', 'amount': 120, 'due_day': 15, 'frequency': 'mensuelle', 'start_month': '2026-01', 'active': True, 'updated_at': NOW, 'deleted_at': None},
            ],
            'charge_payments': [],
            'pockets': [{'id': 'p1', 'name': 'Emergency fund', 'position': 0, 'updated_at': NOW, 'deleted_at': None}],
            'savings': [{'id': 's1', 'date': '2026-09-01', 'amount': 500, 'pocket_id': 'p1', 'kind': 'depot', 'note': 'Monthly savings', 'updated_at': NOW, 'deleted_at': None}],
            'goals': [], 'provisions': [],
        }
    return {
        'settings': {'savings_rate_pct': 15, 'warn_threshold_pct': 80, 'household_name': 'Famille Démo', 'members': ['Moi'], 'currency': 'XOF', 'updated_at': NOW},
        'incomes': [{'id': 'i1', 'date': '2026-09-01', 'amount': 850000, 'source': 'Revenu mensuel', 'method': 'banque', 'recurring': True, 'note': '', 'updated_at': NOW, 'deleted_at': None}],
        'envelopes': [
            {'id': 'e1', 'name': 'Alimentation', 'planned': 180000, 'position': 0, 'updated_at': NOW, 'deleted_at': None},
            {'id': 'e2', 'name': 'Transport', 'planned': 80000, 'position': 1, 'updated_at': NOW, 'deleted_at': None},
            {'id': 'e3', 'name': 'Loisirs', 'planned': 50000, 'position': 2, 'updated_at': NOW, 'deleted_at': None},
        ],
        'budget_overrides': [],
        'expenses': [
            {'id': 'x1', 'date': '2026-09-02', 'amount': 45000, 'envelope_id': 'e1', 'method': 'wave', 'description': 'Courses du mois', 'member': 'Moi', 'charge_id': None, 'override_reason': '', 'updated_at': NOW, 'deleted_at': None},
            {'id': 'x2', 'date': '2026-09-03', 'amount': 18000, 'envelope_id': 'e2', 'method': 'especes', 'description': 'Transport', 'member': 'Moi', 'charge_id': None, 'override_reason': '', 'updated_at': NOW, 'deleted_at': None},
        ],
        'charges': [{'id': 'c1', 'label': 'Loyer', 'amount': 250000, 'due_day': 5, 'frequency': 'mensuelle', 'start_month': '2026-01', 'active': True, 'updated_at': NOW, 'deleted_at': None}],
        'charge_payments': [],
        'pockets': [{'id': 'p1', 'name': 'Épargne de sécurité', 'position': 0, 'updated_at': NOW, 'deleted_at': None}],
        'savings': [{'id': 's1', 'date': '2026-09-01', 'amount': 120000, 'pocket_id': 'p1', 'kind': 'depot', 'note': 'Épargne du mois', 'updated_at': NOW, 'deleted_at': None}],
        'goals': [], 'provisions': [],
    }


def save_rgb(page, path: Path):
    page.screenshot(path=str(path), full_page=False)
    with Image.open(path) as image:
        image.convert('RGB').save(path, format='PNG', optimize=True)
    with Image.open(path) as image:
        if image.size != (1080, 1920):
            raise RuntimeError(f'{path.name}: dimensions {image.size}, expected 1080x1920')
        if image.mode != 'RGB':
            raise RuntimeError(f'{path.name}: mode {image.mode}, expected RGB')
    print(f'{path}: 1080x1920 RGB')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='https://nwodobe.github.io/mon-budget-familial/')
    parser.add_argument('--language', choices=('fr', 'en'), default='fr')
    parser.add_argument('--out', default='playstore/assets')
    args = parser.parse_args()
    out = ROOT / args.out
    out.mkdir(parents=True, exist_ok=True)
    files = ('phone-01-home.png', 'phone-02-expenses.png', 'phone-03-envelopes.png', 'phone-04-premium.png') if args.language == 'en' else ('phone-01-accueil.png', 'phone-02-depenses.png', 'phone-03-enveloppes.png', 'phone-04-premium.png')
    ledger_json = json.dumps(demo_ledger(args.language), ensure_ascii=False)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 360, 'height': 640}, device_scale_factor=3, locale='en-US' if args.language == 'en' else 'fr-FR')
        page = context.new_page()
        page.add_init_script(f"""() => {{
          const ledger = {ledger_json};
          localStorage.setItem('mbf.ledger.v1', JSON.stringify(ledger));
          localStorage.setItem('mbf.language', '{args.language}');
          localStorage.removeItem('mbf.meta.v1');
          sessionStorage.setItem('mbf_screen', 'accueil');
        }}""")
        response = page.goto(args.url, wait_until='networkidle', timeout=60000)
        if response is None or not response.ok:
            raise RuntimeError(f'Unable to load {args.url}: {response.status if response else "no response"}')
        page.get_by_text('Mon Budget Familial', exact=True).first.wait_for(timeout=30000)
        save_rgb(page, out / files[0])

        page.get_by_role('button', name='Add' if args.language == 'en' else 'Ajouter', exact=True).click()
        page.wait_for_timeout(400)
        save_rgb(page, out / files[1])

        page.evaluate("sessionStorage.setItem('mbf_screen','budget')")
        page.reload(wait_until='networkidle')
        page.get_by_text('Budget', exact=True).first.wait_for(timeout=30000)
        save_rgb(page, out / files[2])

        page.evaluate("sessionStorage.setItem('mbf_screen','premium')")
        page.reload(wait_until='networkidle')
        page.get_by_text('Premium', exact=True).first.wait_for(timeout=30000)
        save_rgb(page, out / files[3])
        browser.close()


if __name__ == '__main__':
    main()
