const getGroupAdmins = (participants) => {
	if (!Array.isArray(participants)) return [];
	const admins = [];
	for (const i of participants) {
		if (i.admin === "admin" || i.admin === "superadmin") {
			if (i.id) admins.push(i.id);
			if (i.lid) admins.push(i.lid);
			if (i.phoneNumber) admins.push(i.phoneNumber);
		}
	}
	return admins;
};

export default getGroupAdmins;
