// Toast.jsx — react-hot-toast is configured in main.jsx
// This file exported for future custom toast wrappers
import toast from 'react-hot-toast'

export const showSuccess = (msg) => toast.success(msg)
export const showError   = (msg) => toast.error(msg)
export const showInfo    = (msg, icon = 'ℹ️') => toast(msg, { icon })

export default toast
