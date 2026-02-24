import pool from '../../config/db.js'

export const getMachineScheduleCalendar = async (req, res) => {
  try {
    const { factory_id, start_date, end_date } = req.query

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Missing parameters: start_date, end_date required' })
    }

    // 1. Fetch Machines for the Resource Axis
    let machineQuery = 'SELECT id, name as title FROM machines WHERE deleted_at IS NULL'
    const machineParams = []
    if (factory_id && factory_id !== 'all') {
      machineQuery += ' AND factory_id = $1'
      machineParams.push(factory_id)
    }
    const machinesRes = await pool.query(machineQuery, machineParams)

    // 2. Fetch Schedule Events
    let scheduleQuery = `
            SELECT 
                ms.id,
                ms.machine_id as "resourceId",
                o.order_code as title,
                ms.start_date as start,
                ms.end_date as end,
                pp.status as color_status
            FROM machine_schedules ms
            JOIN machines m ON ms.machine_id = m.id
            JOIN orders o ON ms.order_id = o.id
            JOIN production_plans pp ON ms.production_plan_id = pp.id
            WHERE ms.deleted_at IS NULL
              AND ms.start_date <= $2
              AND ms.end_date >= $1
        `
    const scheduleParams = [start_date, end_date]
    if (factory_id && factory_id !== 'all') {
      scheduleQuery += ' AND m.factory_id = $3'
      scheduleParams.push(factory_id)
    }

    const eventsRes = await pool.query(scheduleQuery, scheduleParams)

    res.json({
      machines: machinesRes.rows,
      events: eventsRes.rows.map(ev => ({
        ...ev,
        allDay: true, // Typical for this kind of planning
        backgroundColor: ev.color_status === 'DONE' ? '#4caf50' : '#2196f3'
      }))
    })
  } catch (error) {
    console.error('Schedule Error:', error)
    res.status(500).json({ message: 'Error retrieving timeline schedule', error })
  }
}
