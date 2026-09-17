export const getCategoryStatGroup = (bill, parentCategory) => {
  const childCategory = parentCategory?.children?.find(category => category.id === bill.categoryId)

  if (childCategory) {
    return {
      id: childCategory.id,
      name: childCategory.name,
      icon: childCategory.icon,
      isOther: false
    }
  }

  return {
    id: 'other',
    name: parentCategory?.name || '其他',
    icon: parentCategory?.icon || '📦',
    isOther: true
  }
}
