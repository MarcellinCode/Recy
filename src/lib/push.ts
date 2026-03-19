export async function sendPushNotification(expoPushToken: string, title: string, body: string, data: any = {}) {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken')) {
    console.log('Invalid or missing Expo Push Token');
    return;
  }

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Expo Push Result:', result);
    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}
