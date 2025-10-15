# Tareas Pendientes para Actualizar Calendario y Préstamos

## 1. Actualizar Esquema de Base de Datos
- [ ] Cambiar `dueDay Int` a `paymentType String` en `prisma/schema.prisma`

## 2. Actualizar API
- [ ] Modificar `app/api/loans/route.ts` para usar `payment_type` en lugar de `due_day`

## 3. Actualizar Interfaces de Préstamo
- [ ] Cambiar `due_day: number` a `payment_type: string` en `components/calendar-view.tsx`
- [ ] Cambiar `due_day: number` a `payment_type: string` en `components/dashboard-content.tsx`

## 4. Modificar Componente de Calendario
- [ ] Remover colores de `getDayClass` en `components/calendar-view.tsx`
- [ ] Reemplazar `+X` con ícono `MoreHorizontal` para más de 2 bancos
- [ ] Agregar click handler a días para mostrar detalles en Dialog
- [ ] Reemplazar navegación con botones por Select para mes y año
- [ ] Actualizar lógica de `getInstallmentsForDay` para usar `payment_type`

## 5. Actualizar Dashboard
- [ ] Cambiar display de "Vence el día: X" a mostrar `payment_type` en `components/dashboard-content.tsx`

## 6. Migración y Pruebas
- [ ] Ejecutar `npx prisma migrate dev` para actualizar esquema
- [ ] Probar funcionalidad del calendario, selectores, clicks y display actualizado
