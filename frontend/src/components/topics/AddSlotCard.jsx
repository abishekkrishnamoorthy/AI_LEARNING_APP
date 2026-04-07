/* eslint-disable react/prop-types */
import { useNavigate } from 'react-router-dom'

function AddSlotCard({ remaining }) {
  const navigate = useNavigate()

  return (
    <button type="button" className="add-slot-card" onClick={() => navigate('/topics/create')}>
      <span className="add-slot-plus">+</span>
      <p className="add-slot-title">Add new topic</p>
      <p className="add-slot-subtitle">{remaining} slot remaining</p>
    </button>
  )
}

export default AddSlotCard
