const pad = (n, size = 4) => String(n).padStart(size, '0');

const nextBranchCode = async (Branch) => {
  const count = await Branch.countDocuments();
  return `BR${pad(count + 1, 3)}`;
};

const nextMemberCode = async (Member) => {
  const count = await Member.countDocuments();
  return `MEM-${pad(count + 1)}`;
};

module.exports = { nextBranchCode, nextMemberCode };
