export function getOrCreateDeviceId(): string {
  try {
    let devId = localStorage.getItem('nursecare_device_id');
    if (!devId) {
      devId = `dev_mob_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('nursecare_device_id', devId);
    }
    return devId;
  } catch (e) {
    return `dev_session_${Math.random().toString(36).substring(2, 8)}`;
  }
}
