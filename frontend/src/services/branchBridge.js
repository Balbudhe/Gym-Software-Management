let branchGetter = () => 'ALL';
let roleGetter = () => null;

export const setBranchGetter = (fn) => {
  branchGetter = fn;
};

export const setRoleGetter = (fn) => {
  roleGetter = fn;
};

export { branchGetter, roleGetter };
