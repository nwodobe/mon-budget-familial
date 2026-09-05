#!/usr/bin/env python3
"""Capture quatre écrans réels du site GitHub Pages avec données locales de démonstration.

Dépendances d'exécution : playwright + Pillow. Le script ne crée aucun compte cloud et
n'injecte aucune donnée personnelle réelle : les données restent dans localStorage.
"""
import json
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

URL = 'https://nwodobe.github.io/mon-budget-familial/'
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'playstore' / 'assets'
OUT.mkdir(parents=True, exist_ok=True)
NOW = '2026-09-05T09:00:00.000Z'

LEDGER = {
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
        {'id': 'x3', 'date': '2026-09-04', 'amount': 12000, 'envelope_id': 'e1', 'method': 'orange_money', 'description': 'Marché', 'member': 'Moi', 'charge_id': None, 'override_reason': '', 'updated_at': NOW, 'deleted_at': None},
    ],
    'charges': [
        {'id': 'c1', 'label': 'Loyer', 'amount': 250000, 'due_day': 5, 'frequency': 'mensuelle', 'start_month': '2026-01', 'active': True, 'updated_at': NOW, 'deleted_at': None},
        {'id': 'c2', 'label': 'Électricité', 'amount': 35000, 'due_day': 15, 'frequency': 'mensuelle', 'start_month': '2026-01', 'active': True, 'updated_at': NOW, 'deleted_at': None},
    ],
    'charge_payments': [],
    'pockets': [{'id': 'p1', 'name': 'Épargne de sécurité', 'position': 0, 'updated_at': NOW, 'deleted_at': None}],
    'savings': [{'id': 's1', 'date': '2026-09-01', 'amount': 120000, 'pocket_id': 'p1', 'kind': 'depot', 'note': 'Épargne du mois', 'updated_at': NOW, 'deleted_at': None}],
    'goals': [],
    'provisions': [],
}

FILES = ('phone-01-accueil.png', 'phone-02-depenses.png', 'phone-03-enveloppes.png', 'phone-04-premium.png')


def save_rgb(page, filename: str):
    path = OUT / filename
    page.screenshot(path=str(path), full_page=False)
    with Image.open(path) as image:
        image.convert('RGB').save(path, format='PNG', optimize=True)
    with Image.open(path) as image:
        if image.size != (1080, 1920):
            raise RuntimeError(f'{filename}: dimensions {image.size}, attendu 1080x1920')
        if image.mode != 'RGB':
            raise RuntimeError(f'{filename}: mode {image.mode}, attendu RGB')
    print(path)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 360, 'height': 640}, device_scale_factor=3, locale='fr-FR')
    page = context.new_page()
    ledger_json = json.dumps(LEDGER, ensure_ascii=False)
    page.add_init_script(f"""() => {{
      const ledger = {ledger_json};
      localStorage.setItem('mbf.ledger.v1', JSON.stringify(ledger));
      localStorage.removeItem('mbf.meta.v1');
      sessionStorage.setItem('mbf_screen', 'accueil');
    }}""")
    response = page.goto(URL, wait_until='networkidle', timeout=60000)
    if response is None or not response.ok:
        raise RuntimeError(f'Échec du chargement de {URL}: {response.status if response else "sans réponse"}')
    page.get_by_text('Mon Budget Familial', exact=True).first.wait_for(timeout=30000)
    save_rgb(page, FILES[0])

    page.get_by_role('button', name='Ajouter', exact=True).click()
    page.wait_for_timeout(400)
    save_rgb(page, FILES[1])

    page.evaluate("sessionStorage.setItem('mbf_screen','budget')")
    page.reload(wait_until='networkidle')
    page.get_by_text('Budget', exact=True).first.wait_for(timeout=30000)
    save_rgb(page, FILES[2])

    page.evaluate("sessionStorage.setItem('mbf_screen','premium')")
    page.reload(wait_until='networkidle')
    page.get_by_text('Premium', exact=True).first.wait_for(timeout=30000)
    save_rgb(page, FILES[3])
    browser.close()
