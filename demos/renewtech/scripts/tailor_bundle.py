"""Apply Renewtech-specific configuration after the standard overlay generator."""
import copy,json,uuid
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'workspace'
def read(p):return json.loads((root/p).read_text())
def write(p,x):(root/p).write_text(json.dumps(x,indent=2,ensure_ascii=False)+'\n')
p='overlay/configuration/search/default-index.json';x=read(p)
mpn=copy.deepcopy(x['payload']['index']['configuration']['product']['data']['keys']['Description'])
mpn.update(weight=20)
mpn['matchTypeSettings'].update(compound=False,endsWith=False,exact=True,fuzzy=False,startsWith=True)
x['payload']['index']['configuration']['product']['data']['keys']['MPN']=mpn
write(p,x)
p='overlay/configuration/merchandising/pin-hero.json';x=read(p);x['payload']['Rule']['Enabled']=False;write(p,x)
p='overlay/configuration/merchandising/boost-category.json';x=read(p)
x.update(id='renewtech-prefer-listed-psu',name='Renewtech: prioritize a listed power supply')
r=x['payload']['Rule'];r.update(Id=str(uuid.uuid5(uuid.NAMESPACE_URL,'renewtech-listed-psu-demo')),Name='Renewtech: prioritize listed PSU 00FK930',Enabled=False)
r['Conditions']={'Context':{'Filters':[{'Locations':['Renewtech - Listed server options']}]},
 'Input':{'EvaluationMode':'Any','Filters':{}},
 'Target':{'Filters':{'Items':[{'$type':'Relewise.Client.Requests.Filters.ProductIdFilter, Relewise.Client','ProductIds':['266152'],'Negated':False,'TypeName':'ProductIdFilter'}]}},
 'User':{'Conditions':{'Items':[]}}}
r['MultiplierSelector']['Value']=1.5
write(p,x)
p='overlay/browser.json';x=read(p);x.update(language='en-gb',currencyCode='EUR',B2bRecommendations=True,trackingEnabled=False);write(p,x)
provenance=read('catalogue/product-provenance.json')
assert all(all(d['origin']=='source' for d in p['description'].values()) for p in provenance.values()),'Descriptions must remain source-derived'
print('Applied exact/prefix MPN search, disabled scoped PSU boost, and B2B browser defaults.')
