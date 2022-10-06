<?php
namespace Swissup\BreezeMirasvitSearchUltimate\Plugin;

class BreezeHelper
{
    /**
     * @param \Swissup\Breeze\Helper\Data $subject
     * @param array $result
     * @return array
     */
    public function afterGetExcludedUrls(
        \Swissup\Breeze\Helper\Data $subject,
        $result
    ) {
        $result[] = 'searchautocomplete/cart/add';

        return $result;
    }
}
