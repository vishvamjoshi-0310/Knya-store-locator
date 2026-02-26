// Encrypts the data using AES and then encrypts the AES key using RSA with a public key code.

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAsWxa9eGQ6S31wGOL3gaa
6RlbBBxazPmMCZXJQ9dMfP/2cmLx4sgln0uZHQtJ0VED6XfFMCmOVytczFxq+cXY
QgrbKTLTWAPB4RD8bBuDvZiUvuiTdWViqsODhjoodNvMqy04qegx7uWbS2Evqepk
ywyRobLQJG5IeZUptcHvwvjPkI2XIk/TRznmsLhuqTO/PN1+a47+v9Ajak67chzj
HiOx2D4kulvgNbnVAiwcjIvsc+gIxH0j9k9qmrumihFBDNIoahLTRgWYfG936pv2
kdYW3YJyt4D6bCdKSMz665dgRucYqaZbH5pABVn03Kh/DbyTyCUV5TDZ/qB0Uox1
uADAxR2xCesdIDrgXv/ENXBSxLQ2tggzcEN+m9I22bQOly61asO++X0et7/Y5Vog
l4iIMDoZ6XuSh8zjqBfoIoKj6Zs2azB4fNDTknoe3htE8Bs8EhsgWCWPwsq+7oaq
HX29F++Mad4UjZWJPjK2my4sb4sx/W9jwvHDlvKLvSbl7eqXfHj/XgqlwYZu3ZMX
lL9kfNxr+Gfv9Lo47uKQ+/uTn6baw/Z1FTxFdX0XSrG2V5ehCNumsCIXa5OLy9+5
2/9CJM0sNyB9sv/WnSsCo0sobN/ZhmoY2a8WwizLu2VH/JVmLKnmZ4ssbdnyc0Am
cdSxFFye77e2f3J8zOKY5BMCAwEAAQ==
-----END PUBLIC KEY-----
`;

const arrayBufferToBase64 = (buffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return window.btoa(binary);
};

const generateAESKey = async () => {
  return await window.crypto.subtle.generateKey({ name: "AES-CBC", length: 256 }, true, ["encrypt", "decrypt"]);
};

const encryptAES = async (data, aesKey) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(16));
  const encodedData = new TextEncoder().encode(JSON.stringify(data));
  const encryptedBuffer = await window.crypto.subtle.encrypt({ name: "AES-CBC", iv }, aesKey, encodedData);
  return {
    encryptedData: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv),
  };
};

const importPublicKey = async (pemKey) => {
  const binaryDerString = window.atob(pemKey.replace(/-----.*?-----/g, "").replace(/\n/g, ""));
  const binaryDer = new Uint8Array(binaryDerString.length).map((char, i) => binaryDerString.charCodeAt(i));
  return await window.crypto.subtle.importKey("spki", binaryDer, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
};

const encryptRSA = async (aesKey) => {
  const publicKey = await importPublicKey(PUBLIC_KEY);
  const exportedKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const encryptedBuffer = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, exportedKey);
  return arrayBufferToBase64(encryptedBuffer);
};