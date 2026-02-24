import express from 'express'
import morgan from 'morgan'
import cors from 'cors'

import authRoutes from './modules/auth/auth.routes.js'
import userRoutes from './modules/user/user.routes.js'

import factoryRoutes from './modules/factory/factory.routes.js'
import machineRoutes from './modules/machine/machine.routes.js'
import operationRoutes from './modules/operation/operation.routes.js'
import productGroupRoutes from './modules/product-group/product-group.routes.js'
import productRoutes from './modules/product/product.routes.js'
import customerRoutes from './modules/customer/customer.routes.js'
import orderRoutes from './modules/order/order.routes.js'
import productionPlanningRoutes from './modules/production-planning/production-planning.routes.js'
import machineScheduleRoutes from './modules/machine-schedule/machine-schedule.routes.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('combined'))

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/factories', factoryRoutes)
app.use('/api/machines', machineRoutes)
app.use('/api/operations', operationRoutes)
app.use('/api/product-groups', productGroupRoutes)
app.use('/api/products', productRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/production-plans', productionPlanningRoutes)
app.use('/api/machine-schedule', machineScheduleRoutes)

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Something broke!' })
})

const hostname = 'localhost'
const port = 8017
app.get('/', (req, res) => {
  res.send('<h1>Prosimex MES API</h1><hr>')
})

app.listen(port, hostname, () => {
  // eslint-disable-next-line no-console
  console.log(`Hello PiTunDev, MES API is running at http://${hostname}:${port}/`)
})
