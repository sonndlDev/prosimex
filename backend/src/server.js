import express from 'express'
import morgan from 'morgan'
import cors from 'cors'

process.env.TZ = 'Asia/Ho_Chi_Minh'

import authRoutes from './modules/auth/auth.routes.js'
import userRoutes from './modules/user/user.routes.js'
import workerRoutes from './modules/worker/worker.routes.js'
import workerAssignmentRoutes from './modules/worker/worker-assignment.routes.js'

import factoryRoutes from './modules/factory/factory.routes.js'
import machineRoutes from './modules/machine/machine.routes.js'
import operationRoutes from './modules/operation/operation.routes.js'
import productGroupRoutes from './modules/product-group/product-group.routes.js'
import productRoutes from './modules/product/product.routes.js'
import customerRoutes from './modules/customer/customer.routes.js'
import orderRoutes from './modules/order/order.routes.js'
import productionPlanningRoutes from './modules/production-planning/production-planning.routes.js'
import machineScheduleRoutes from './modules/machine-schedule/machine-schedule.routes.js'
import attendanceRoutes from './modules/attendance/attendance.routes.js'
import dailyTicketRoutes from './modules/daily-ticket/daily-ticket.routes.js'
import outsourcingRoutes from './modules/outsourcing/outsourcing.routes.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('combined'))

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/workers', workerRoutes)
app.use('/api/worker-assignments', workerAssignmentRoutes)
app.use('/api/factories', factoryRoutes)
app.use('/api/machines', machineRoutes)
app.use('/api/operations', operationRoutes)
app.use('/api/product-groups', productGroupRoutes)
app.use('/api/products', productRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/production-plans', productionPlanningRoutes)
app.use('/api/machine-schedule', machineScheduleRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/daily-tickets', dailyTicketRoutes)
app.use('/api/outsourcing', outsourcingRoutes)

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Something broke!' })
})

const hostname = 'localhost'
const port = 3000
app.get('/', (req, res) => {
  res.send('<h1>Prosimex MES API</h1><hr>')
})

// app.listen(port, hostname, () => {
//   // eslint-disable-next-line no-console
//   console.log(`Hello PiTunDev, MES API is running at http://${hostname}:${port}/`)
// })

app.listen(port, '0.0.0.0', () => {
  console.log(`Hello PiTunDev, MES API is running at http://${hostname}:${port}/`)
})
