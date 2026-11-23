import * as service from './auto-ticket-schedule.service.js'

const sendError = (res, error) => {
  const status = error.status || 500
  if (status === 500) console.error('[AutoTicketSchedule]', error)
  res.status(status).json({ message: status === 500 ? 'Lỗi server' : error.message })
}

export const getRules = async (req, res) => {
  try {
    res.json({ data: await service.listRules() })
  } catch (error) {
    sendError(res, error)
  }
}

export const createRule = async (req, res) => {
  try {
    const data = await service.createRule(req.body, req.user.id)
    res.status(201).json({ data })
  } catch (error) {
    sendError(res, error)
  }
}

export const updateRuleStatus = async (req, res) => {
  try {
    const data = await service.updateRuleStatus(req.params.id, req.body?.status, req.user.id)
    res.json({ data })
  } catch (error) {
    sendError(res, error)
  }
}

export const deleteRule = async (req, res) => {
  try {
    res.json(await service.deleteRule(req.params.id, req.user.id))
  } catch (error) {
    sendError(res, error)
  }
}
