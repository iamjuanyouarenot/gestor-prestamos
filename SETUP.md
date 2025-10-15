# Configuración de la Base de Datos

## Pasos para inicializar la base de datos desde cero

### 1. Asegúrate de tener la variable de entorno configurada

La variable `DATABASE_URL` debe estar configurada en tu proyecto de Vercel o en tu archivo `.env.local`:

\`\`\`
DATABASE_URL="postgresql://neondb_owner:npg_rCo3MKcZNs4D@ep-mute-heart-acxciwew-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
\`\`\`

### 2. Instala las dependencias

\`\`\`bash
npm install
\`\`\`

### 3. Genera el cliente de Prisma

\`\`\`bash
npm run prisma:generate
\`\`\`

### 4. Crea las tablas en la base de datos

\`\`\`bash
npm run prisma:push
\`\`\`

Este comando creará todas las tablas definidas en `prisma/schema.prisma` en tu base de datos Neon.

### 5. Ejecuta el seed para crear el usuario inicial

\`\`\`bash
npm run prisma:seed
\`\`\`

Este comando creará:
- Usuario: `agile` con contraseña: `12345`
- Un préstamo de ejemplo con sus cuotas

### Comando rápido (todo en uno)

\`\`\`bash
npm run db:setup
\`\`\`

Este comando ejecuta `prisma:push` y `prisma:seed` en secuencia.

## Verificar la base de datos

Puedes abrir Prisma Studio para ver los datos:

\`\`\`bash
npm run prisma:studio
\`\`\`

## Estructura de la base de datos

### Tablas creadas:

1. **users** - Usuarios del sistema
   - id, username, password, created_at

2. **loans** - Préstamos bancarios
   - id, user_id, bank_name, loan_type, total_amount, monthly_payment, start_date, end_date, due_day, is_active, created_at

3. **installments** - Cuotas de los préstamos
   - id, loan_id, installment_number, due_date, amount, is_paid, paid_date, late_fee, notes, created_at

4. **payments** - Historial de pagos
   - id, loan_id, amount, payment_date, payment_month, notes, created_at

## Credenciales de acceso

- **Usuario:** agile
- **Contraseña:** 12345

## Solución de problemas

Si tienes errores de conexión:

1. Verifica que la variable `DATABASE_URL` esté correctamente configurada
2. Asegúrate de que tu base de datos Neon esté activa
3. Verifica que no haya firewalls bloqueando la conexión
4. Intenta regenerar el cliente de Prisma: `npm run prisma:generate`
