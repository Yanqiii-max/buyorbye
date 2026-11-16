import os, sys
from PIL import Image
SRC='/Users/syq/Documents/claude/qianlai/产品/'; OUT=sys.argv[1]
singles={'bag':'午夜巴黎复古酒红手提包','bunnybank':'复古蝴蝶结兔子陶瓷存钱罐','musicbox':'复古黄铜机械音乐盒海报','jet':'天际线奢华私人商务机','piano':'奢华透明水晶钢琴定制展示','duck':'宇航员鸭鸭摆件展示','catmug':'小猫爪陶瓷杯特写','clover':'幸运四叶草树脂冰箱贴','moonlamp':'月亮小兔暖光夜灯','yacht':'极光号私人豪华游艇、】【','brooch':'橙蝶珐琅金属胸针精品展示','jellylamp':'水母玻璃艺术灯','car':'深绿复古豪华敞篷跑车','crown':'皇家蓝宝石钻石皇冠展示','bearkey':'草莓帽小熊钥匙扣 环亚','hairclip':'银河星河玻璃发夹展示','gown':'高级定制晚礼服广告'}
grids={
 '日用小物精选六品格_grid':(3,2,0.655,['tissue','tissuebox3','chopsticks10','sponge','glasscup','napkin']),
 '奶蛙生活好物精选_grid':(4,3,0.69,['frogfig','frogplush','froglamp','frogart','froghoodie','frogtee','frogmug','frogpillow','frogkey','frogmetal','frogblind','froggiant']),
 '极简高端服饰购物目录':(4,3,0.625,['tee','jeans','cardigan','blouse','wisteria','dragonjacket','widepants','woolcoat','qipao','workjacket','inkskirt',None]),
 '雅致生活美学精品画廊':(5,3,0.632,['bowl','plate','zitanchop','tissuecase','embnapkin','jadetable','diningchair','jellyfloor','teaset','angel','babyart',None,None,None,'scarf']),
}
for pid,f in singles.items():
    im=Image.open(SRC+f+'.png').convert('RGB'); W,H=im.size
    box=(int(W*0.44),0,W,H) if pid=='catmug' else (0,0,W,int(H*0.765))
    im.crop(box).save(f'{OUT}/{pid}.png')
for f,(c,r,frac,ids) in grids.items():
    im=Image.open(SRC+f+'.png').convert('RGB'); W,H=im.size; cw,ch=W/c,H/r
    for k,pid in enumerate(ids):
        if not pid: continue
        x0=int((k%c)*cw)+12; y0=int((k//c)*ch)+10
        cell=im.crop((x0,y0,int((k%c+1)*cw)-12,int(y0-10+ch*frac)))
        cell=cell.resize((cell.width*2,cell.height*2),Image.LANCZOS)
        cell.save(f'{OUT}/{pid}.png')
print(len(os.listdir(OUT)))
