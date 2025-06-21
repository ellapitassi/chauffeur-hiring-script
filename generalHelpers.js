function getBaseConvo(name) {
    if (typeof name !== "string") return undefined;
    const parts = name.split('_');
    return parts.slice(0, -1).join('_'); // all but the last part
}