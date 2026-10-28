"""Normalize Thomas's two XML snapshots. Run from repo root with --feeds ../data.
No import or network writes. Source text, IDs and prices remain unchanged.
"""
import argparse, hashlib, html, json, re, xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--feeds', type=Path, required=True)
args = parser.parse_args()

def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')

def text(value):
    return html.unescape(re.sub('<[^>]+>', '', value or '')).strip()

def slug(value):
    return re.sub('[^a-z0-9]+', '-', value.lower()).strip('-')

feeds = {}
for market in ['com', 'dk']:
    rows = {}
    for _, node in ET.iterparse(args.feeds / f'renewtech-{market}.xml', events=['end']):
        if node.tag != 'item':
            continue
        row = {x.tag.split('}')[-1]: text(x.text) for x in node if not len(x)}
        row['details'] = [{x.tag.split('}')[-1]: text(x.text) for x in detail} for detail in node if detail.tag.endswith('product_detail')]
        rows[row['id']] = row
        node.clear()
    feeds[market] = rows
com, dk = feeds['com'], feeds['dk']

def references(row):
    chunks = [x['attribute_value'] for x in row['details'] if x['attribute_name'].startswith('Component IDs') and 'in stock' not in x['attribute_name']]
    return list(dict.fromkeys(x.strip() for chunk in chunks for x in chunk.split(',') if x.strip()))

def eligible(id):
    return all(id in source and source[id].get('image_link', '').startswith('https://') and source[id].get('price') and len(re.sub(r'\s+', ' ', source[id]['description'])) >= 24 for source in [com, dk])

# Each story contains one choice per functional component role, rather than substitutes.
# These are illustrative baskets using listed options, pending customer validation of dependencies.
groups = [
    dict(id='lenovo-server-expansion', name='Expand a Lenovo System x3650 M5', anchorProductId='330177',
         companionProductIds=['228129','263593','266163','190377','257902'],
         accessoryProductIds=['266152','269878','210552'],
         rationale='One CPU, memory, SFF drive, controller and network adapter, with power, riser and RAID upgrade. All are listed options for this server. Slot, chassis and option dependencies still require validation.'),
    dict(id='dell-server-refresh', name='Refresh a Dell PowerEdge R730', anchorProductId='351867',
         companionProductIds=['282692','257278','224876','222281','211029'],
         accessoryProductIds=['241166','224046','234902'],
         rationale='One CPU, memory, SFF drive, controller and network adapter, with power, rails and bezel. Listed server options form a sample procurement journey, not a validated build.'),
    dict(id='hp-server-maintenance', name='Maintain an HP ProLiant DL380 G9', anchorProductId='344416',
         companionProductIds=['256988','226821','201970','242494','192333'],
         accessoryProductIds=['202006','263509','297138'],
         rationale='One CPU, memory, SFF drive, controller and network adapter, with power, rails and cable management. Listed server options form a sample maintenance journey, pending configuration checks.')
]
featured = set()
selected = set()
for group in groups:
    anchor = group['anchorProductId']
    ids = [anchor] + group['companionProductIds'] + group['accessoryProductIds']
    for id in ids:
        assert eligible(id), f'Featured source data incomplete: {id}'
        assert all(feeds[m][id]['availability'] == 'in stock' for m in feeds)
        assert id == anchor or id in references(com[anchor]), f'{id} not listed for {anchor}'
    featured.update(ids)
    selected.update(id for id in references(com[anchor]) if eligible(id))
selected.update(featured)
# A broad but manageable catalogue: sample each source brand/department deterministically.
buckets = defaultdict(list)
for id in sorted(set(com) & set(dk)):
    if eligible(id):
        path = com[id]['product_type'].split('>')
        buckets[(path[0].strip(), path[1].strip() if len(path)>1 else 'Products')].append(id)
for (brand, _), values in buckets.items():
    if brand in {'DELL','LENOVO','HPE','IBM','CISCO','EMC','NETAPP','Servers','Storage'}:
        selected.update(values[:8])

products=[]
for id in sorted(selected):
    a,b = com[id],dk[id]
    path = [x.strip() for x in a['product_type'].split('>') if x.strip()]
    # Source brand > part department hierarchy is retained, with readable labels.
    path = [x.title().replace('Cpu', 'CPU').replace('Sfp', 'SFP').replace('Hpe','HPE').replace('Ibm','IBM') for x in path]
    if len(path)<2: path = [a['brand'] or 'Enterprise hardware', path[0] if path else 'Components']
    facets = {'MPN':a['mpn'], 'Condition':a['custom_label_1'], 'SourceKind':a['custom_label_0'],
              'SourceUrl':{'en-gb':a['link'],'da-dk':b['link']},
              'PriceBasis':'Configuration starting price' if a['custom_label_0']=='config' else 'Feed price',
              'SourceConditionStock':[x['attribute_name']+': '+x['attribute_value'] for x in a['details'] if x.get('section_name')=='Stock by condition']}
    refs = references(a)
    if refs:
        facets['ListedComponentIds'] = [i for i in refs if i in selected]
        facets['SourceComponentCount'] = len(refs)
        facets['OptionGroups'] = next((x['attribute_value'] for x in a['details'] if x['attribute_name']=='Option groups'), '')
    products.append(dict(id=id,productType='base',brandId=slug(a['brand'] or path[0]),brandName=a['brand'] or path[0],
        name={'en-gb':a['title'],'da-dk':b['title']},description={'en-gb':a['description'],'da-dk':b['description']},
        availability={locale:10 if row['availability']=='in stock' else 0 for locale,row in [('en-gb',a),('da-dk',b)]},
        listPrice={'EUR':float(a['price'].split()[0]),'DKK':float(b['price'].split()[0])},
        salesPrice={'EUR':float(a['price'].split()[0]),'DKK':float(b['price'].split()[0])},
        mainCategoryId=slug(path[0]),mainCategoryName={'en-gb':path[0],'da-dk':path[0]},taxonomyPath=path,
        subcategories=[dict(id=slug(path[0]+'-'+path[1]),name={'en-gb':path[1],'da-dk':path[1]})],
        imageUrl=a['image_link'],margin='Unknown',markets=['gb','dk'],channels=['B2B'],
        promoted={'en-gb':False,'da-dk':False},onSale={'en-gb':False,'da-dk':False},
        complementaryProductIds=[],accessoryProductIds=[],facets=facets))
workspace=ROOT/'workspace'
dump(workspace/'catalogue/products.json',products)
dump(workspace/'catalogue/content.json',[])
dump(workspace/'overlay/affinity-groups.json',{'groups':groups})
descriptor=json.loads((workspace/'customer-demo.json').read_text())
descriptor.update(id='customer-renewtech-parts-discovery',displayName='Renewtech parts discovery',version='1.0.0')
descriptor['catalogue'].update(id='customer-renewtech',displayName='Renewtech',version='2026.10.28')
descriptor['overlay'].update(id='customer-renewtech-overlay',displayName='Renewtech demo stories')
descriptor['profiles']=[{'id':id,'version':'1.0.0','selection':'required'} for id in ['commerce-base','b2b','retail-media']]
dump(workspace/'customer-demo.json',descriptor)
dump(ROOT/'source-provenance.json',{
 'capturedDate':'2026-10-28','source':'Thomas Bjørn Nielsen, email thread Renewtech x Relewise – input til demo på jeres data',
 'snapshots':{m:{'file':f'renewtech-{m}.xml','sha256':hashlib.sha256((args.feeds/f'renewtech-{m}.xml').read_bytes()).hexdigest(),'records':len(v)} for m,v in feeds.items()},
 'normalizedProducts':len(products),'featuredProducts':sorted(featured),
 'mapping':{'id':'g:id','name':'g:title, unchanged','description':'g:description, markup stripped only','price':'g:price, same list and sales price','availability':'in stock => storefront value 10, otherwise 0; not physical quantity','relationships':'explicit Component IDs, numbered chunks split independently at commas','market':'COM represented as gb/en-gb for runner convention, EUR; DK as dk/da-dk, DKK'},
 'warnings':['Curated subset, not full catalogue. Only shared market IDs with source images, prices and descriptions.','DK titles retain source English. No translated copy invented.','Margin Unknown is a sentinel, not a commercial margin. No discount invented.','No variants fabricated. Condition stock stays as source text.','Listed components do not prove selected-option compatibility.','Affinity groups and generated behavior are synthetic demo scenarios, not customer purchase evidence.','Generated guides, campaigns, personas and merchandising are demonstration configuration, not customer facts.','Products with missing prices excluded; configuration prices are starting prices.','No historical behavior or customer identities included.']})
dump(ROOT/'story-products.json',[{'id':g['anchorProductId'],'name':com[g['anchorProductId']]['title'],'componentIds':next(p['facets']['ListedComponentIds'] for p in products if p['id']==g['anchorProductId'])} for g in groups])
print(f'Normalized {len(products)} products, {len(featured)} featured products, three source-linked journeys')
