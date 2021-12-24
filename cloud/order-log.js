Parse.Cloud.beforeSave('OrderLog', async (req) => {
  const obj = req.object

  if (!req.master) throw 'Not Authorized'

  if (!obj.existed()) {
    const acl = new Parse.ACL()
    acl.setRoleReadAccess('Admin', true)
    acl.setRoleWriteAccess('Admin', false)
    obj.setACL(acl)
  }
})