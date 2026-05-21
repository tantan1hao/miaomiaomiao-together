import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const masterSchool = {
  legacyId: 'bistu',
  name: '北京信息科技大学',
  abbr: 'BISTU',
  admin: '西风漂流'
};

const canteens = [
  {
    name: '一食堂',
    floors: [
      { name: '一楼', shops: ['黄焖鸡米饭', '麻辣香锅', '兰州拉面'] },
      { name: '二楼', shops: ['自助餐', '酸菜鱼', '煲仔饭'] }
    ]
  },
  {
    name: '二食堂',
    floors: [
      { name: '一楼', shops: ['沙县小吃', '桂林米粉', '川菜馆'] },
      { name: '二楼', shops: ['麻辣烫', '烤鱼', '奶茶店'] }
    ]
  }
];

const dishes = [
  { name: '黄焖鸡米饭', shopName: '黄焖鸡米饭', floorName: '一楼', category: '盖饭', description: '酱香浓郁，适合作为默认选择。' },
  { name: '麻辣香锅', shopName: '麻辣香锅', floorName: '一楼', category: '麻辣', description: '可自选荤素，适合多人拼单。' },
  { name: '酸菜鱼', shopName: '酸菜鱼', floorName: '二楼', category: '热菜', description: '酸辣口味，评分榜首批示例菜。' },
  { name: '桂林米粉', shopName: '桂林米粉', floorName: '一楼', category: '粉面', description: '出餐快，适合赶课前后。' }
];

async function main() {
  const school = await prisma.school.upsert({
    where: { legacyId: masterSchool.legacyId },
    create: {
      ...masterSchool,
      order: 1,
      passwordHash: await bcrypt.hash('123456', 10)
    },
    update: masterSchool
  });

  for (const [index, canteen] of canteens.entries()) {
    await prisma.canteen.upsert({
      where: { schoolId_name: { schoolId: school.id, name: canteen.name } },
      create: {
        schoolId: school.id,
        name: canteen.name,
        order: index + 1,
        floors: canteen.floors
      },
      update: {
        order: index + 1,
        floors: canteen.floors
      }
    });
  }

  for (const [index, name] of ['盖饭', '麻辣', '热菜', '粉面', '饮品'].entries()) {
    const existing = await prisma.category.findFirst({ where: { schoolId: school.id, name } });
    if (!existing) {
      await prisma.category.create({ data: { schoolId: school.id, name, order: index + 1 } });
    }
  }

  const seedUser = await prisma.user.upsert({
    where: { openid: 'seed_user' },
    create: { openid: 'seed_user', nickname: '示例用户' },
    update: {}
  });

  for (const dish of dishes) {
    const category = await prisma.category.findFirst({ where: { schoolId: school.id, name: dish.category } });
    const canteen = await prisma.canteen.findFirst({ where: { schoolId: school.id } });
    const created = await prisma.dish.findFirst({ where: { schoolId: school.id, name: dish.name } })
      || await prisma.dish.create({ data: {
        schoolId: school.id,
        categoryId: category?.id,
        canteenId: canteen?.id,
        uploaderId: seedUser.id,
        name: dish.name,
        shopName: dish.shopName,
        floorName: dish.floorName,
        description: dish.description
      } });
    const score = 4 + (Math.random() > 0.5 ? 1 : 0);
    await prisma.rating.upsert({
      where: { dishId_userId: { dishId: created.id, userId: seedUser.id } },
      create: { dishId: created.id, userId: seedUser.id, score },
      update: { score }
    });
    await prisma.dish.update({
      where: { id: created.id },
      data: { avgScore: score, scoreSum: score, ratingCount: 1, lastRatedAt: new Date() }
    });
  }

  await prisma.announcement.updateMany({ where: { schoolId: school.id }, data: { active: false } });
  await prisma.announcement.create({
    data: {
      schoolId: school.id,
      content: '菜品评分排行榜试运行中，欢迎上传和评分。',
      active: true
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
