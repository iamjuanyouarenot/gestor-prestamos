# Pago de Préstamos

Sistema de gestión de pagos de préstamos bancarios con calendario mensual, seguimiento de cuotas y alertas de vencimiento.

## 🚀 Características

- 🔐 Sistema de autenticación (usuario: agile, contraseña: 12345)
- 📅 Calendario mensual interactivo con visualización de pagos
- 💰 Gestión completa de préstamos y cuotas
- ⚠️ Alertas automáticas de pagos vencidos
- 💸 Sistema de moras para pagos atrasados
- 📊 Dashboard con resumen de próximos vencimientos
- 📱 Diseño responsive para móvil y desktop

## 📋 Requisitos Previos

- Node.js 18+ instalado
- npm o yarn
- Cuenta en Neon (PostgreSQL serverless)

## 🛠️ Instalación y Configuración

### 1. Clonar el Repositorio

\`\`\`bash
git clone <tu-repositorio>
cd pago-de-prestamos
\`\`\`

### 2. Instalar Dependencias

\`\`\`bash
npm install
\`\`\`

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

\`\`\`env
# Neon Database URL
DATABASE_URL="postgresql://neondb_owner:npg_rCo3MKcZNs4D@ep-mute-heart-acxciwew-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
\`\`\`

### 4. Inicializar Base de Datos

El proyecto usa SQL directo con Neon. Ejecuta los scripts SQL en orden:

**Opción A: Desde v0.app (Recomendado)**
1. Ve a tu proyecto en v0.app
2. Haz clic en "Apply Scripts" para ejecutar automáticamente:
   - `scripts/01-create-tables.sql` - Crea las tablas
   - `scripts/02-seed-data.sql` - Crea el usuario y datos de ejemplo

**Opción B: Manualmente desde Neon Dashboard**
1. Ve a tu proyecto en [Neon Console](https://console.neon.tech)
2. Abre el SQL Editor
3. Ejecuta el contenido de `scripts/01-create-tables.sql`
4. Ejecuta el contenido de `scripts/02-seed-data.sql`

### 5. Iniciar Servidor de Desarrollo

\`\`\`bash
npm run dev
\`\`\`

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 👤 Credenciales de Acceso

- **Usuario**: agile
- **Contraseña**: 12345

## 📁 Estructura del Proyecto

\`\`\`
pago-de-prestamos/
├── app/
│   ├── api/
│   │   ├── auth/login/          # API de autenticación
│   │   ├── loans/               # API de préstamos
│   │   └── installments/        # API de cuotas
│   ├── dashboard/               # Dashboard principal
│   ├── login/                   # Página de login
│   └── layout.tsx               # Layout principal
├── components/
│   ├── ui/                      # Componentes shadcn/ui
│   ├── calendar-view.tsx        # Calendario mensual
│   ├── dashboard-content.tsx    # Contenido del dashboard
│   ├── add-loan-form.tsx        # Formulario agregar préstamo
│   └── edit-loan-form.tsx       # Formulario editar préstamo
├── lib/
│   ├── db.ts                    # Cliente de Neon
│   └── auth.ts                  # Utilidades de autenticación
├── scripts/
│   ├── 01-create-tables.sql     # Script crear tablas
│   └── 02-seed-data.sql         # Script datos iniciales
└── prisma/
    └── schema.prisma            # Schema de Prisma (referencia)
\`\`\`

## 🗄️ Estructura de la Base de Datos

### Tabla: users
\`\`\`sql
- id (SERIAL PRIMARY KEY)
- username (VARCHAR UNIQUE)
- password (VARCHAR)
- created_at (TIMESTAMP)
\`\`\`

### Tabla: loans
\`\`\`sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER)
- bank_name (VARCHAR)
- loan_type (VARCHAR)
- total_amount (DECIMAL)
- monthly_payment (DECIMAL)
- due_day (INTEGER)
- start_date (DATE)
- end_date (DATE)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
\`\`\`

### Tabla: installments
\`\`\`sql
- id (SERIAL PRIMARY KEY)
- loan_id (INTEGER)
- installment_number (INTEGER)
- due_date (DATE)
- amount (DECIMAL)
- is_paid (BOOLEAN)
- paid_date (DATE)
- late_fee (DECIMAL)
- created_at (TIMESTAMP)
\`\`\`

## 🎯 Uso del Sistema

### 1. Iniciar Sesión
- Accede a `/login`
- Ingresa usuario: `agile` y contraseña: `12345`

### 2. Ver Dashboard
- Visualiza el resumen de tus préstamos
- Ve el calendario mensual con los días de pago
- Revisa los próximos vencimientos

### 3. Agregar Préstamo
- Haz clic en "Agregar Préstamo"
- Completa el formulario:
  - Nombre del banco
  - Tipo de préstamo
  - Monto total
  - Monto de cuota mensual
  - Número de cuotas
  - Día de vencimiento (1-31)
  - Fecha de inicio
  - Fecha de finalización (se calcula automáticamente)

### 4. Calendario Mensual
- Navega entre meses con las flechas
- Los días con pagos se resaltan:
  - 🟢 Verde: Pagado
  - 🟠 Naranja: Pendiente
  - 🔴 Rojo: Vencido
- Haz clic en un día para ver los préstamos de ese día
- Haz clic en un préstamo para ver detalles y opciones

### 5. Gestionar Pagos
- Marca cuotas como pagadas
- Agrega moras para pagos atrasados
- Edita o elimina préstamos

## 🔧 Comandos Útiles

\`\`\`bash
# Desarrollo
npm run dev              # Iniciar servidor de desarrollo
npm run build            # Construir para producción
npm run start            # Iniciar servidor de producción

# Linting
npm run lint             # Ejecutar ESLint
\`\`\`

## 🐛 Solución de Problemas

### Error: "relation does not exist"
- Asegúrate de haber ejecutado los scripts SQL en orden
- Verifica que el schema "public" exista en tu base de datos Neon

### Error de conexión a Neon
- Verifica que la variable `DATABASE_URL` esté correctamente configurada
- Asegúrate de que tu IP esté permitida en Neon (o usa pooling)

### Calendario no muestra cuotas
- Verifica que las cuotas se hayan creado correctamente en la base de datos
- Revisa la consola del navegador para ver logs de debug

### Formulario dice "todos los campos son requeridos"
- Asegúrate de completar TODOS los campos del formulario
- Verifica que las fechas sean válidas (fecha fin > fecha inicio)

## 🚀 Deployment en Vercel

1. Conecta tu repositorio a Vercel
2. Configura la variable de entorno `DATABASE_URL` en Vercel
3. Despliega el proyecto
4. Ejecuta los scripts SQL en tu base de datos Neon

## 🛡️ Seguridad

⚠️ **IMPORTANTE**: Este es un proyecto de demostración. Para producción:
- Cambia las credenciales por defecto
- Implementa hash de contraseñas (bcrypt)
- Agrega validación de sesiones con JWT
- Implementa HTTPS
- Agrega rate limiting

## 📝 Tecnologías

- **Next.js 15** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Neon** - PostgreSQL serverless
- **Tailwind CSS v4** - Framework de estilos
- **shadcn/ui** - Componentes UI
- **@neondatabase/serverless** - Cliente SQL para Neon

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Si tienes problemas o preguntas:
- Revisa la sección de Solución de Problemas
- Abre un issue en GitHub
- Contacta al equipo de desarrollo
