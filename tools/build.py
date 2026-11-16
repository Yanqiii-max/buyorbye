import os, json, base64, io, random, math
from PIL import Image
Q='/Users/syq/Documents/claude/qianlai/'; os.makedirs(Q+'img',exist_ok=True)
S={'tiny':('小物研究所','Tiny Things Lab'),'frog':('奶蛙工作室','Milk Frog Studio'),'daily':('日日杂货','Everyday Goods'),'cloud':('云上衣橱','Cloud Wardrobe'),'diexi':('蝶戏蛟龙','Butterfly & Dragon'),'grace':('雅致生活','Graceful Living'),'sky':('天际线航空','Skyline Aviation'),'aurora':('极光游艇','Aurora Yachts'),'motor':('老爷车行','Heritage Motors'),'royal':('皇家珠宝','Royal Jewels'),'crystal':('水晶琴坊','Crystal Keys'),'paris':('午夜巴黎','Minuit Paris'),'glowj':('深海灯屋','Deep Sea Lights')}
R=[
('bag','wear',4800,1.1,'paris','午夜巴黎复古手提包','Midnight Paris Vintage Handbag','酒红色真皮包身，黄铜锁扣，经典复古轮廓。','Burgundy leather, a brass lock and a classic vintage shape.'),
('bunnybank','shelf',199,.95,'tiny','复古兔子陶瓷存钱罐','Vintage Bunny Piggy Bank','复古奶油色陶瓷，戴着蝴蝶结的小兔子。','A cream ceramic bunny wearing a bow, ready for your coins.'),
('musicbox','table',799,1.0,'tiny','复古机械音乐盒','Vintage Mechanical Music Box','胡桃木底座搭配黄铜机械结构，重现旧日旋律。','Walnut base and a brass movement under glass, playing an old tune.'),
('jet','floor',68000000,1.6,'sky','天际线·私人商务飞机','Skyline Private Jet','珍珠白机身，定制豪华客舱，尊享云端旅程。如果有钱了，你会买吗？','Pearl-white fuselage and a custom cabin. If you had the money, would you?'),
('piano','floor',880000,2.6,'crystal','私人定制水晶钢琴','Bespoke Crystal Grand Piano','透明水晶质感琴身，融合艺术与音乐之美。','A see-through crystal body where art meets music.'),
('duck','shelf',39,.95,'tiny','宇航员鸭鸭摆件','Astronaut Duck Figurine','宇航服造型小黄鸭，圆润可爱的桌面装饰。','A little yellow duck in a space suit for your desk.'),
('catmug','table',69,.8,'tiny','小猫爪陶瓷杯','Cat Paw Ceramic Mug','高温陶瓷，奶白色釉面，杯底是立体猫爪造型，可爱又实用。','Milk-white glazed ceramic with paw-shaped feet. Cute and practical.'),
('clover','wall',29,.85,'tiny','幸运四叶草冰箱贴','Lucky Clover Fridge Magnet','透明树脂封存一片四叶草，清新治愈的小小幸运。','A four-leaf clover sealed in clear resin. A small piece of luck.'),
('moonlamp','table',299,1.15,'tiny','月亮小兔夜灯','Moon Bunny Night Light','月球纹理灯罩，暖色柔光，陪伴温柔夜晚。','A sleeping bunny on a glowing moon, with warm, soft light.'),
('yacht','floor',28800000,1.5,'aurora','极光号·私人豪华游艇','Aurora Private Yacht','流线型现代船体，宽阔甲板与奢华私人空间。','A sleek modern hull, wide decks and plenty of private space.'),
('brooch','wear',2680,.8,'diexi','橙蝶珐琅金属胸针','Orange Butterfly Enamel Brooch','橙色珐琅蝴蝶与金色金属线条交织。','Orange enamel wings traced in gold.'),
('jellylamp','table',1280,1.25,'glowj','水母玻璃艺术灯','Jellyfish Glass Art Lamp','透明玻璃水母造型，蓝紫光影营造深海氛围。','A glass jellyfish glowing blue and violet, like the deep sea.'),
('car','floor',6800000,1.5,'motor','复古豪华收藏跑车','Vintage Collector Roadster','深绿色流线车身，经典复古设计与奢华内饰。','Deep green bodywork, classic lines and a tan leather interior.'),
('crown','wear',9800000,.8,'royal','皇家蓝宝石皇冠','Royal Sapphire Crown','蓝宝石与钻石交相辉映，华丽典雅的珠宝冠饰。','Sapphires and diamonds in a full royal crown.'),
('bearkey','shelf',19,.9,'tiny','草莓小熊钥匙扣','Strawberry Bear Keychain','柔软毛绒小熊，草莓帽兜设计，附精致挂饰。','A plush bear in a strawberry hood, with charms.'),
('hairclip','wear',89,.6,'tiny','银河玻璃发夹','Galaxy Glass Hair Clip','蓝紫渐变玻璃质感，闪烁着细腻的星河光泽。','Blue-violet glass with a fine galaxy shimmer.'),
('gown','wear',98000,1.9,'cloud','高级定制晚礼服','Couture Evening Gown','真丝面料结合手工刺绣与珠饰，优雅华丽。','Silk with hand embroidery and beading.'),
('tissue','table',4.9,.5,'daily','便携迷你纸巾','Pocket Tissues','三层柔韧纸张，轻巧便携，日常随手用。','Three-ply, pocket-sized, always handy.'),
('tissuebox3','table',12.9,.75,'daily','柔白抽纸三包装','Soft Tissues, 3-Pack','原生木浆纸张，柔软亲肤，简洁日用包装。','Virgin pulp, soft on skin, simple packaging.'),
('chopsticks10','table',19.9,.55,'daily','原木竹筷十双装','Bamboo Chopsticks, 10 Pairs','天然竹材，圆润打磨，日常餐桌好搭档。','Natural bamboo, smoothly finished, for everyday meals.'),
('sponge','table',9.9,.6,'daily','小熊洗碗海绵','Bear Dish Sponge','亲水海绵与细密清洁层，萌趣又实用。','A bear-shaped sponge that really does scrub.'),
('glasscup','table',39,.8,'daily','双层玻璃水杯','Double-Wall Glass Cup','通透耐热玻璃，简洁直筒杯型。','Clear heat-proof glass in a simple straight shape.'),
('napkin','table',59,.6,'daily','奶油色棉麻餐巾','Cream Linen Napkin','细腻棉麻肌理，柔软耐用，适合日常餐桌。','Soft cotton-linen for the everyday table.'),
('frogfig','shelf',1280,1.0,'frog','奶蛙经典手办','Milk Frog Classic Figure','原版造型，高级树脂手办。','The original pose in fine resin.'),
('frogplush','shelf',299,.8,'frog','奶蛙抱云毛绒玩偶','Milk Frog Cloud Plush','柔软亲肤，治愈陪伴。','Soft, huggable and comforting.'),
('froglamp','table',399,1.05,'frog','奶蛙夜灯','Milk Frog Night Light','柔和暖光，营造温馨氛围。','A warm, gentle glow for the bedside.'),
('frogart','wall',18000,1.35,'frog','奶蛙主题艺术画','Milk Frog Art Print','艺术微喷限量版，独立编号。','Limited giclée edition, individually numbered.'),
('froghoodie','wear',399,1.4,'frog','奶蛙印花连帽卫衣','Milk Frog Hoodie','舒适棉质面料，宽松百搭。','Comfy cotton in a relaxed fit.'),
('frogtee','wear',169,1.3,'frog','奶蛙短袖T恤','Milk Frog T-Shirt','柔软棉质，清新简约。','Soft cotton, clean and simple.'),
('frogmug','table',128,.8,'frog','奶蛙陶瓷马克杯','Milk Frog Ceramic Mug','手工釉色，温润可爱。','Hand-glazed and very round.'),
('frogpillow','floor',159,1.2,'frog','奶蛙抱枕','Milk Frog Cushion','立体刺绣，柔软舒适。','Raised embroidery, soft to lean on.'),
('frogkey','shelf',29,.9,'frog','奶蛙钥匙扣','Milk Frog Keychain','轻巧便携，挂包点缀。','Light and portable, made for your bag.'),
('frogmetal','shelf',12800,1.0,'frog','奶蛙金属雕塑摆件','Milk Frog Metal Sculpture','镜面不锈钢，艺术收藏级摆件。','Mirror-polished steel, collector grade.'),
('frogblind','shelf',69,.7,'frog','奶蛙盲盒系列（单只）','Milk Frog Blind Box (single)','多款造型，惊喜收藏。','Several poses. You find out which one when you open it.'),
('froggiant','floor',1280000,3.6,'frog','巨型奶蛙艺术装置（定制）','Giant Milk Frog Installation (custom)','大型公共艺术雕塑，可定制尺寸与材质。','A large public sculpture, in a size and material of your choice.'),
('tee','wear',49,1.3,'cloud','基础宽松白T恤','Basic Relaxed White Tee','柔软纯棉，落肩剪裁，清爽百搭。','Soft cotton with dropped shoulders. Goes with everything.'),
('jeans','wear',159,1.6,'cloud','复古直筒牛仔裤','Vintage Straight Jeans','水洗靛蓝牛仔布，经典直筒版型。','Washed indigo denim in a classic straight leg.'),
('cardigan','wear',259,1.35,'cloud','奶油针织开衫','Cream Knit Cardigan','细腻针织，软糯触感，轻松叠穿。','Fine cable knit, soft and easy to layer.'),
('blouse','wear',680,1.3,'cloud','蝴蝶结真丝衬衫','Bow Silk Blouse','光泽丝滑，优雅知性，适合多场景。','Glossy silk with a bow at the neck.'),
('wisteria','wear',3680,1.7,'cloud','紫藤丝质连衣裙','Wisteria Silk Dress','飘逸真丝，紫藤花色，轻盈浪漫。','Floaty silk in a wisteria print.'),
('dragonjacket','wear',12800,1.4,'diexi','蝶龙刺绣外套','Butterfly & Dragon Embroidered Jacket','东方神话主题刺绣，匠心工艺。','Hand embroidery on an Eastern myth theme.'),
('widepants','wear',2980,1.7,'cloud','高定阔腿裤','Couture Wide-Leg Trousers','挺阔垂感面料，利落大气。','Crisp fabric with a clean drape.'),
('woolcoat','wear',6800,1.7,'cloud','云雾羊毛大衣','Mist Wool Coat','细腻羊毛，温暖轻盈，优雅廓形。','Fine wool, warm and light, in a soft lilac.'),
('qipao','wear',5980,1.8,'cloud','花枝刺绣旗袍','Blossom Embroidered Qipao','立体刺绣，东方雅韵，修身优雅。','Raised floral embroidery in a slim fit.'),
('workjacket','wear',1280,1.4,'cloud','复古工装夹克','Vintage Work Jacket','挺括棉质面料，复古耐穿。','Sturdy cotton with a corduroy collar.'),
('inkskirt','wear',1980,1.6,'cloud','水墨渐变半裙','Ink Gradient Skirt','轻盈薄纱，水墨晕染，灵动飘逸。','Layers of tulle fading from cream into ink green.'),
('bowl','table',128,.6,'grace','青花牡丹饭碗','Blue Peony Rice Bowl','手工绘制，日常雅致耐用。','Hand-painted blue and white, made for daily use.'),
('plate','table',680,.85,'diexi','蝶戏花枝餐盘','Butterfly & Blossom Plate','珐琅彩工艺，典雅精致。','Enamel colours, with one butterfly resting on the rim.'),
('zitanchop','table',298,.55,'grace','紫檀镶嵌筷子','Inlaid Rosewood Chopsticks','天然紫檀木，手工镶嵌。','Natural rosewood with hand inlay, and a rest to match.'),
('tissuecase','table',168,.7,'grace','花影纸巾盒','Blossom Tissue Box','简约雅致，点缀生活美学。','A little elegance for the table.'),
('embnapkin','table',380,.6,'grace','刺绣餐巾','Embroidered Napkins','高支棉手工刺绣，柔软优雅。','Fine cotton, embroidered by hand.'),
('jadetable','floor',58000,1.4,'grace','翡翠石圆桌','Jade Stone Round Table','天然玉石台面，典雅大气。','A natural stone top on a green jade base.'),
('diningchair','floor',6800,2.2,'grace','云境餐椅','Cloud Dining Chair','弧形设计，舒适雅致。','A curved walnut frame with a bouclé seat.'),
('jellyfloor','floor',12800,4.0,'glowj','海月落地灯','Moon Jelly Floor Lamp','手工玻璃，柔和梦幻光影。','Hand-blown glass that throws soft, dreamy light.'),
('teaset','table',2980,.85,'grace','鎏金玻璃茶具套装','Gilded Glass Tea Set','晶透通透，金饰点缀。','Clear cut glass trimmed in gold.'),
('angel','shelf',1280,.85,'grace','天使手办','Sleeping Angel Figure','艺术收藏级摆件，温柔治愈。','A collector piece. Quiet and soothing.'),
('babyart','wall',18000,1.35,'grace','《熟睡》手绘油画','“Asleep”, hand-painted oil','手绘原作，独一无二。','An original painting. There is only one.'),
('scarf','wear',680,1.3,'diexi','蝶戏丝巾','Butterfly Silk Scarf','桑蚕丝材质，轻盈柔滑。','Mulberry silk, light and smooth.'),
]
BG=['#F4EEE4','#EEF3F8','#F6EEF0','#EEF5EE','#F7F1E2','#F0EDF7','#F8EEE6','#EAF3F3']
random.seed(11)
def nice(x):
    m=10**max(0,int(math.log10(x))-1); return int(round(x/m)*m)
prods=[]; stk={}
for i,(pid,cat,price,rh,sk,zh,en,dzh,den) in enumerate(R):
    im=Image.open(f'cut/{pid}.png').convert('RGBA')
    big=im.copy(); big.thumbnail((760,760),Image.LANCZOS); big.save(Q+f'img/{pid}.webp','WEBP',quality=86,method=6)
    sm=im.copy(); sm.thumbnail((230,230),Image.LANCZOS); b=io.BytesIO(); sm.save(b,'WEBP',quality=80,method=6); stk[pid]='data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
    v=random.randint(500,4200); rate=min(.34,0.34*price**-0.22)*random.uniform(.7,1.3); b_=max(1,round(v*rate))
    target=nice(price*b_*random.uniform(1.15,3.6)) if random.random()<.68 and pid!='babyart' else 0
    prods.append({'id':pid,'pic':f'img/{pid}.webp','kind':'new','cat':cat,'price':price,'target':target,'base':{'v':v,'b':b_},'rh':rh,'bg':BG[i%len(BG)],'seller':{'zh':S[sk][0],'en':S[sk][1]},'title':{'zh':zh,'en':en},'desc':{'zh':dzh,'en':den}})
first=['catmug','froglamp','car','mug','tissue','dragonjacket','camera','moonlamp','jet','beanie','bunnybank','crown','sponge','dusk','frogplush','gown','lamp','jellylamp']
js="/* 钱来 — 用户提供的实拍风商品（由 产品/ 里的图片裁切、抠图生成）。重新生成见项目备忘。 */\n(function(){\n  const QL=window.QL, add="+json.dumps(prods,ensure_ascii=False,separators=(',',':'))+";\n"
js+="  const all=QL.SEED.products.concat(add), map={}; all.forEach(p=>map[p.id]=p);\n  const first="+json.dumps(first)+";\n"
js+="""  // 排序：先放一组精选，其余实拍和插画交替出现
  const rest=all.filter(p=>!first.includes(p.id)), A=rest.filter(p=>p.pic), B=rest.filter(p=>!p.pic), mix=[];
  let s=7; const rnd=()=>(s=(s*16807)%2147483647)/2147483647; for(let i=A.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[A[i],A[j]]=[A[j],A[i]];}
  while(A.length||B.length){ if(A.length)mix.push(A.shift()); if(A.length)mix.push(A.shift()); if(B.length)mix.push(B.shift()); }
  QL.SEED.products=first.map(id=>map[id]).filter(Boolean).concat(mix);
  const nb={momo:['catmug','bunnybank','hairclip','moonlamp','blouse','frogplush','clover','bowl'],ashu:['musicbox','jellylamp','workjacket','diningchair','frogfig','teaset'],lucas:['car','bag','frogmetal','jadetable','duck','glasscup','babyart']};
  QL.SEED.neighbors.forEach(n=>{ n.items=(nb[n.id]||[]).concat(n.items); });
})();
"""
open(Q+'js/seed2.js','w',encoding='utf-8').write(js)
open(Q+'js/stickers.js','w',encoding='utf-8').write("/* 钱来 — 直接双击打开（file://）时房间里用的小贴纸，联网版不加载 */\nwindow.QL=window.QL||{};QL.STK="+json.dumps(stk,separators=(',',':'))+";\n")
print(len(prods), 'img KB', sum(os.path.getsize(Q+'img/'+f) for f in os.listdir(Q+'img'))//1024, 'stickers KB', os.path.getsize(Q+'js/stickers.js')//1024, 'seed2 KB', os.path.getsize(Q+'js/seed2.js')//1024)
