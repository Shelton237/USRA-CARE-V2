#!/bin/bash
# Script de déploiement USRA-CARE V2
# Usage: bash deploy.sh
set -e

APP_DIR="/var/www/usra-care-v2"
REPO="https://github.com/Shelton237/USRA-CARE-V2.git"
PORT=3001
APP_NAME="usra-care-v2"

echo "🚀 Déploiement USRA-CARE V2..."

# 1. Cloner ou mettre à jour le repo
if [ -d "$APP_DIR/.git" ]; then
  echo "📥 Mise à jour du repo..."
  cd $APP_DIR
  git pull origin main
else
  echo "📥 Clonage du repo..."
  sudo mkdir -p $APP_DIR
  sudo chown $USER:$USER $APP_DIR
  git clone $REPO $APP_DIR
  cd $APP_DIR
fi

# 2. Installer les dépendances
echo "📦 Installation des dépendances..."
npm ci --production=false

# 3. Générer le client Prisma
echo "🔧 Génération client Prisma..."
npx prisma generate

# 4. Migrer la base de données
echo "🗄️  Migration base de données..."
npx prisma db push

# 5. Seeder si première installation
if [ "$1" == "--seed" ]; then
  echo "🌱 Seeding..."
  npx ts-node --project tsconfig.seed.json prisma/seed.ts
  npx ts-node --project tsconfig.seed.json prisma/add-hanta.ts
fi

# 6. Build Next.js
echo "🏗️  Build Next.js..."
npm run build

# 7. Démarrer / redémarrer avec PM2
echo "⚡ Démarrage PM2..."
if pm2 list | grep -q $APP_NAME; then
  pm2 restart $APP_NAME
else
  pm2 start npm --name $APP_NAME -- run start -- --port $PORT
fi
pm2 save

echo "✅ Déploiement terminé ! App sur http://localhost:$PORT/v2"
